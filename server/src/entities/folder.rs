use super::{
    get_page_query_params,
    user::{self, UserInfo},
    Paginated,
};
use crate::entities::board::BoardInfo;
use crate::libs::state::DbClient;
use futures_util::try_join;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize)]
pub struct Folder {
    pub title: String,
    pub public_id: String,
    pub contents: Vec<BoardInfo>,
    pub owner_first_name: String,
    pub owner_second_name: String,
    pub owner_public_login: String,
    pub is_owned: bool,
}

#[derive(Debug, Deserialize)]
pub struct FolderInfo {
    pub public_id: String,
    pub title: String,
    pub add_board_ids: Vec<u64>,
    pub remove_board_ids: Vec<u64>,
}

pub async fn create(
    db_client: &DbClient,
    title: String,
    owner_id: i32,
) -> Result<Uuid, tokio_postgres::Error> {
    // create a folder
    let public_id = Uuid::new_v4();
    db_client
        .execute(
            "INSERT INTO folders(title, owner_id, public_id) VALUES ($1, $2, $3)",
            &[&title, &owner_id, &public_id.to_string()],
        )
        .await?;

    Ok(public_id)
}

pub async fn read(
    db_client: &DbClient,
    public_id: String,
    owner_id: Option<i32>,
) -> Option<Folder> {
    // get folder
    match db_client
        .query_one(
            "SELECT title, owner_id, id, public_id FROM folders WHERE public_id = ($1)",
            &[&public_id],
        )
        .await
    {
        Ok(row) => {
            // get folder contents
            let contents = db_client.query(
                "SELECT title, id, public_id FROM boards WHERE id IN (SELECT board_id FROM board_folder WHERE folder_id = ($1)) ORDER BY id DESC", 
                &[&row.get::<&str, i32>("id")]
            ).await.expect("failed to query folder contents");
            // get owner_info
            let owner_info = match row.try_get("owner_id") {
                Ok(id) => user::read(db_client, id)
                    .await
                    .unwrap_or(UserInfo::default()),
                Err(_) => UserInfo::default(),
            };
            // return folder
            let is_owned = match owner_id {
                Some(id) => id == row.get::<&str, i32>("owner_id"),
                None => false,
            };
            return Some(Folder {
                is_owned,
                title: row.get("title"),
                public_id: row.get("public_id"),
                contents: contents
                    .iter()
                    .map(|row| BoardInfo {
                        title: row.get("title"),
                        id: row.get("id"),
                        public_id: row.get("public_id"),
                    })
                    .collect(),
                owner_public_login: owner_info.public_login,
                owner_first_name: owner_info.first_name,
                owner_second_name: owner_info.second_name,
            });
        }
        Err(_) => return None,
    }
}

#[derive(Serialize)]
pub struct FolderShortInfo {
    title: String,
    id: i32,
    public_id: String,
}

pub async fn read_list_by_owner(
    db_client: &DbClient,
    page: i64,
    owner_id: i32,
) -> Paginated<Vec<FolderShortInfo>> {
    match db_client
        .query_one(
            "SELECT COUNT(*) FROM folders WHERE owner_id = ($1)",
            &[&owner_id],
        )
        .await
    {
        Ok(count) => {
            let query_params = get_page_query_params(count.get("count"), page);
            let rows = db_client
                .query(
                    "SELECT title, id, public_id FROM folders WHERE owner_id = ($1) ORDER BY id DESC LIMIT ($2) OFFSET ($3)",
                    &[&owner_id, &query_params.limit, &query_params.offset],
                )
                .await.unwrap();

            Paginated {
                content: rows
                    .iter()
                    .map(|row| {
                        return FolderShortInfo {
                            id: row.get("id"),
                            title: row.get("title"),
                            public_id: row.get("public_id"),
                        };
                    })
                    .collect(),
                current_page: page,
                max_page: query_params.max_page,
            }
        }
        Err(_) => Paginated {
            content: vec![],
            current_page: 1,
            max_page: 1,
        },
    }
}

pub async fn is_owned_by_public_id(db_client: &DbClient, public_id: String, owner_id: i32) -> bool {
    match db_client
        .query_one(
            "SELECT owner_id FROM folders WHERE public_id = ($1)",
            &[&public_id],
        )
        .await
    {
        Ok(row) => return row.get::<&str, i32>("owner_id") == owner_id,
        Err(_) => return false,
    }
}

pub async fn update(db_client: &DbClient, folder: FolderInfo) -> Result<(), tokio_postgres::Error> {
    let db_folder = db_client
        .query_one(
            "SELECT id, title FROM folders WHERE public_id = ($1)",
            &[&folder.public_id],
        )
        .await?;
    let folder_id = db_folder.get::<&str, i32>("id");
    // create id arrays
    let to_add: Vec<String> = folder
        .add_board_ids
        .iter()
        .map(|id| id.to_string())
        .collect();
    let to_remove: Vec<String> = folder
        .remove_board_ids
        .iter()
        .map(|id| id.to_string())
        .collect();
    let add_arr: Vec<String> = to_add
        .iter()
        .map(|id| format!("({}, {})", id, folder_id))
        .collect();
    let add_arr = add_arr.join(",");
    let remove_arr = to_remove.join(",");
    // update folder
    try_join!(
        async {
            if db_folder.get::<&str, String>("title") == folder.title {
                return Ok(0);
            }
            db_client
                .execute(
                    "UPDATE folders SET title = ($1) WHERE id = ($2)",
                    &[&folder.title, &folder_id],
                )
                .await
        },
        async {
            if add_arr.len() < 2 {
                return Ok(0);
            }
            db_client
                .execute(
                    &format!(
                        "INSERT INTO board_folder(board_id, folder_id) VALUES {}",
                        add_arr
                    ),
                    &[],
                )
                .await
        },
        async {
            if remove_arr.len() == 0 {
                return Ok(0);
            }
            db_client
                .execute(
                    &format!(
                        "DELETE FROM board_folder WHERE board_id IN ({})",
                        remove_arr
                    ),
                    &[],
                )
                .await
        },
    )?;

    Ok(())
}

pub async fn delete(db_client: &DbClient, public_id: String) -> Result<u64, tokio_postgres::Error> {
    db_client
        .execute("DELETE FROM folders WHERE public_id = ($1)", &[&public_id])
        .await
}
