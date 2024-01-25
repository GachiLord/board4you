use super::common::{as_string, generate_res, with_user_data, CONTENT_LENGTH_LIMIT};
use crate::{
    entities::folder,
    libs::{
        auth::UserData,
        state::{DbClient, JwtKey},
    },
    with_db_client,
};
use serde::Deserialize;
use serde_json::json;
use warp::http::{Response, StatusCode};
use warp::Filter;

pub fn folder_filter(
    db_client: DbClient,
    jwt_key: JwtKey,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    let base_path = warp::path("folder");

    let create = warp::post()
        .and(base_path)
        .and(with_db_client(db_client.clone()))
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_user_data(&db_client, jwt_key.clone()))
        .and_then(create_folder);
    let read = warp::get()
        .and(base_path)
        .and(with_db_client(db_client.clone()))
        .and(with_user_data(&db_client, jwt_key.clone()))
        .and(warp::path::param())
        .and_then(read_folder);
    let read_own = warp::get()
        .and(warp::path("folders"))
        .and(warp::path("own"))
        .and(with_db_client(db_client.clone()))
        .and(with_user_data(&db_client, jwt_key.clone()))
        .and(warp::path::param())
        .and_then(read_own_folders_list);
    let update = warp::patch()
        .and(base_path)
        .and(with_db_client(db_client.clone()))
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_user_data(&db_client, jwt_key.clone()))
        .and_then(update_folder_contents);
    let delete = warp::delete()
        .and(base_path)
        .and(with_db_client(db_client.clone()))
        .and(warp::path::param())
        .and(with_user_data(&db_client, jwt_key))
        .and_then(delete_folder);

    create.or(read).or(read_own).or(update).or(delete)
}

#[derive(Deserialize)]
struct FolderInitials {
    title: String,
}

async fn create_folder(
    db_client: DbClient,
    folder: String,
    user_data: Option<UserData>,
) -> Result<impl warp::Reply, warp::Rejection> {
    // parse folder
    let folder: FolderInitials = match serde_json::from_str(&folder) {
        Ok(f) => f,
        Err(_) => return Ok(generate_res(StatusCode::BAD_REQUEST, None)),
    };
    if folder.title.len() > 36 {
        return Ok(generate_res(
            StatusCode::BAD_REQUEST,
            Some("title is too long"),
        ));
    }
    // create folder
    match user_data {
        Some(data) => match folder::create(&db_client, folder.title, data.id).await {
            Ok(public_id) => {
                return Ok(Response::builder()
                    .status(StatusCode::OK)
                    .body(json!({ "public_id": public_id.to_string() }).to_string()))
            }
            Err(_) => return Ok(generate_res(StatusCode::INTERNAL_SERVER_ERROR, None)),
        },
        None => return Ok(generate_res(StatusCode::UNAUTHORIZED, None)),
    }
}

async fn read_folder(
    db_client: DbClient,
    user_data: Option<UserData>,
    public_id: String,
) -> Result<impl warp::Reply, warp::Rejection> {
    let user_id = match user_data {
        Some(user) => Some(user.id),
        None => None,
    };
    match folder::read(&db_client, public_id, user_id).await {
        Some(folder) => Ok(Response::builder()
            .status(StatusCode::OK)
            .body(serde_json::to_string(&folder).unwrap())),
        None => Ok(generate_res(StatusCode::NOT_FOUND, None)),
    }
}

async fn read_own_folders_list(
    db_client: DbClient,
    user_data: Option<UserData>,
    page: u16,
) -> Result<impl warp::Reply, warp::Rejection> {
    match user_data {
        Some(user) => {
            let folder_list = folder::read_list_by_owner(&db_client, page as i64, user.id).await;

            return Ok(Response::builder()
                .status(StatusCode::OK)
                .body(serde_json::to_string(&folder_list).unwrap()));
        }
        None => return Ok(generate_res(StatusCode::UNAUTHORIZED, None)),
    }
}

async fn update_folder_contents(
    db_client: DbClient,
    update_info: String,
    user_data: Option<UserData>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let folder_info: folder::FolderInfo = match serde_json::from_str(&update_info) {
        Ok(info) => info,
        Err(_) => return Ok(generate_res(StatusCode::BAD_REQUEST, None)),
    };
    if folder_info.title.len() > 36 {
        return Ok(generate_res(StatusCode::OK, Some("title is too long")));
    }

    match user_data {
        Some(user) => {
            // check if user is owner
            if !folder::is_owned_by_public_id(&db_client, folder_info.public_id.clone(), user.id)
                .await
            {
                return Ok(generate_res(
                    StatusCode::FORBIDDEN,
                    Some("user is not owner"),
                ));
            }
            // update folder
            if let Err(_) = folder::update(&db_client, folder_info).await {
                return Ok(generate_res(StatusCode::INTERNAL_SERVER_ERROR, None));
            }
            return Ok(Response::builder()
                .status(StatusCode::OK)
                .body("updated".to_string()));
        }
        None => return Ok(generate_res(StatusCode::UNAUTHORIZED, None)),
    }
}

async fn delete_folder(
    db_client: DbClient,
    public_id: String,
    user_data: Option<UserData>,
) -> Result<impl warp::Reply, warp::Rejection> {
    match user_data {
        Some(user) => {
            // check if user is owner
            if !folder::is_owned_by_public_id(&db_client, public_id.clone(), user.id).await {
                return Ok(generate_res(
                    StatusCode::FORBIDDEN,
                    Some("user is not owner"),
                ));
            }
            // delete folder
            if let Err(_) = folder::delete(&db_client, public_id).await {
                return Ok(generate_res(StatusCode::NOT_FOUND, Some("no such folder")));
            }
            // response
            return Ok(Response::builder()
                .status(StatusCode::OK)
                .body("deleted".to_string()));
        }
        None => return Ok(generate_res(StatusCode::UNAUTHORIZED, None)),
    }
}
