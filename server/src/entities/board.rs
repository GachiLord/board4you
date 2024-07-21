use super::{get_page_query_params, Paginated};
use crate::{
    libs::state::{Board, DbClient, Room},
    PoolWrapper,
};
use data_encoding::BASE64URL;
use jwt_simple::algorithms::HS256Key;
use protocol::board_protocol::BoardSize;
use serde::{Deserialize, Serialize};
use std::error::Error;

pub enum SaveAction {
    Created(i32),
    Updated(i32),
}
/// Inserts new row if there is no room in db
/// or Updates existing row
///
/// # Panics
///
/// Panics if board_state cannot be serialized
///
/// # Errors
///
/// This function will return an error if:
/// - failed to insert new row
/// - failed to update existing row
pub async fn save(client: &DbClient<'_>, room: &mut Room) -> Result<SaveAction, Box<dyn Error>> {
    match client
        .query(
            "SELECT * FROM boards WHERE public_id = $1",
            &[&room.public_id],
        )
        .await
    {
        Ok(res) => {
            if res.len() == 0 {
                let created = client.query_one(
                    "INSERT INTO boards(public_id, private_id, owner_id, title) VALUES ($1, $2, $3, $4) RETURNING id",
                    &[&room.public_id, &room.private_id,  &room.owner_id, &room.board.title]
                ).await?;

                room.board.id = created.get("id");
                Ok(SaveAction::Created(room.board.id))
            } else {
                client
                    .execute(
                        "UPDATE boards SET title = ($1) WHERE public_id = ($2)",
                        &[&room.board.title, &room.public_id],
                    )
                    .await?;

                room.board.id = res[0].get("id");
                Ok(SaveAction::Updated(room.board.id))
            }
        }
        Err(e) => Err(Box::new(e)),
    }
}

pub async fn get(
    pool: &'static PoolWrapper,
    public_id: &str,
) -> Result<(Box<str>, Board), tokio_postgres::Error> {
    let db_client = pool.get().await;
    let sql_res = db_client
        .query_one("SELECT * FROM boards WHERE public_id = $1", &[&public_id])
        .await?;

    // TODO: handle old db schema values
    let board = Board {
        pool,
        queue: Vec::with_capacity(10),
        id: sql_res.get("id"),
        size: BoardSize {
            height: sql_res.get::<&str, i16>("height").try_into().unwrap_or(900),
            width: sql_res.get::<&str, i16>("width").try_into().unwrap_or(1720),
        },
        title: sql_res.get("title"),
        co_editor_private_id: (BASE64URL.encode(&HS256Key::generate().to_bytes()) + "_co_editor")
            .into_boxed_str(),
        // TODO: change 10 to const
    };
    let private_id = sql_res.get("private_id");

    Ok((private_id, board))
}

#[derive(Debug, Serialize)]
pub struct BoardInfo {
    pub id: i32,
    pub title: Box<str>,
    pub public_id: Box<str>,
}

pub async fn get_by_owner(
    client: &DbClient<'_>,
    page: i64,
    owner_id: i32,
) -> Result<Paginated<Vec<BoardInfo>>, tokio_postgres::Error> {
    let count = client
        .query_one(
            "SELECT COUNT(*) FROM boards WHERE owner_id = ($1)",
            &[&owner_id],
        )
        .await?;
    let query_params = get_page_query_params(count.get("count"), page);

    let result = client
        .query(
            "SELECT id, title, public_id FROM boards WHERE owner_id = ($1) ORDER BY id DESC LIMIT ($2) OFFSET ($3)",
            &[&owner_id, &query_params.limit, &query_params.offset],
        )
        .await?;

    Ok(Paginated {
        content: result
            .iter()
            .map(|row| BoardInfo {
                title: row.get("title"),
                public_id: row.get("public_id"),
                id: row.get("id"),
            })
            .collect(),
        current_page: page,
        max_page: query_params.max_page,
    })
}

pub async fn delete(
    client: &DbClient<'_>,
    public_id: &str,
    private_id: &str,
) -> Result<u64, tokio_postgres::Error> {
    client
        .execute(
            "DELETE FROM boards WHERE public_id = ($1) AND private_id = ($2)",
            &[&public_id, &private_id],
        )
        .await
}

#[derive(Deserialize, Serialize)]
pub struct RoomCredentials {
    pub public_id: Box<str>,
    pub private_id: Box<str>,
}

pub async fn get_private_ids(
    client: &DbClient<'_>,
    owner_id: i32,
) -> Result<Vec<RoomCredentials>, tokio_postgres::Error> {
    let res = client
        .query(
            "SELECT private_id, public_id FROM boards WHERE owner_id=($1)",
            &[&owner_id],
        )
        .await?
        .iter()
        .map(|row| {
            return RoomCredentials {
                public_id: row.get("public_id"),
                private_id: row.get("private_id"),
            };
        })
        .collect::<Vec<RoomCredentials>>();
    Ok(res)
}
