use super::common::{as_string, with_user_data, UserDataFromJwt, CONTENT_LENGTH_LIMIT};
use crate::{
    entities::folder,
    libs::state::{DbClient, JwtKey},
    with_db_client,
};
use serde::Deserialize;
use serde_json::json;
use warp::http::{header::SET_COOKIE, Response, StatusCode};
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
    user_data: UserDataFromJwt,
) -> Result<impl warp::Reply, warp::Rejection> {
    // parse folder
    let folder: FolderInitials = match serde_json::from_str(&folder) {
        Ok(f) => f,
        Err(_) => {
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body("failed to parse body".to_string())
                .unwrap())
        }
    };
    // create folder
    match user_data.user_data {
        Some(data) => match folder::create(&db_client, folder.title, data.id).await {
            Ok(public_id) => match user_data.new_jwt_cookie_values {
                Some((c1, c2)) => {
                    return Ok(Response::builder()
                        .status(StatusCode::OK)
                        .header(SET_COOKIE, c1)
                        .header(SET_COOKIE, c2)
                        .body(json!({ "public_id": public_id.to_string() }).to_string())
                        .unwrap())
                }
                None => {
                    return Ok(Response::builder()
                        .status(StatusCode::OK)
                        .body(json!({ "public_id": public_id.to_string() }).to_string())
                        .unwrap())
                }
            },
            Err(_) => {
                return Ok(Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body("cannot create the folder".to_string())
                    .unwrap())
            }
        },
        None => {
            return Ok(Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .body("auth to create folders".to_string())
                .unwrap())
        }
    }
}

async fn read_folder(
    db_client: DbClient,
    user_data: UserDataFromJwt,
    public_id: String,
) -> Result<impl warp::Reply, warp::Rejection> {
    let user_id = match user_data.user_data {
        Some(user) => Some(user.id),
        None => None,
    };
    match folder::read(&db_client, public_id, user_id).await {
        Some(folder) => match user_data.new_jwt_cookie_values {
            Some((c1, c2)) => Ok(Response::builder()
                .status(StatusCode::OK)
                .header(SET_COOKIE, c1)
                .header(SET_COOKIE, c2)
                .body(serde_json::to_string(&folder).unwrap())
                .unwrap()),
            None => Ok(Response::builder()
                .status(StatusCode::OK)
                .body(serde_json::to_string(&folder).unwrap())
                .unwrap()),
        },
        None => Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body("no such folder".to_string())
            .unwrap()),
    }
}

async fn read_own_folders_list(
    db_client: DbClient,
    user_data: UserDataFromJwt,
) -> Result<impl warp::Reply, warp::Rejection> {
    match user_data.user_data {
        Some(user) => {
            let folder_list = folder::read_list_by_owner(&db_client, user.id).await;

            match user_data.new_jwt_cookie_values {
                Some((c1, c2)) => {
                    return Ok(Response::builder()
                        .status(StatusCode::OK)
                        .header(SET_COOKIE, c1)
                        .header(SET_COOKIE, c2)
                        .body(serde_json::to_string(&folder_list).unwrap())
                        .unwrap())
                }
                None => {
                    return Ok(Response::builder()
                        .status(StatusCode::OK)
                        .body(serde_json::to_string(&folder_list).unwrap())
                        .unwrap())
                }
            }
        }
        None => {
            return Ok(Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .body("auth to read own folders".to_string())
                .unwrap())
        }
    }
}

async fn update_folder_contents(
    db_client: DbClient,
    update_info: String,
    user_data: UserDataFromJwt,
) -> Result<impl warp::Reply, warp::Rejection> {
    let folder_info: folder::FolderInfo = match serde_json::from_str(&update_info) {
        Ok(info) => info,
        Err(_) => {
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body("failed to parse body")
                .unwrap())
        }
    };

    match user_data.user_data {
        Some(user) => {
            // check if user is owner
            if !folder::is_owned_by_public_id(&db_client, folder_info.public_id.clone(), user.id)
                .await
            {
                return Ok(Response::builder()
                    .status(StatusCode::FORBIDDEN)
                    .body("user is not owner")
                    .unwrap());
            }
            // update folder
            if let Err(_) = folder::update(&db_client, folder_info).await {
                return Ok(Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body("failed to update the folder")
                    .unwrap());
            }
            match user_data.new_jwt_cookie_values {
                // send response
                Some((c1, c2)) => {
                    return Ok(Response::builder()
                        .status(StatusCode::OK)
                        .header(SET_COOKIE, c1)
                        .header(SET_COOKIE, c2)
                        .body("updated")
                        .unwrap())
                }
                None => {
                    return Ok(Response::builder()
                        .status(StatusCode::OK)
                        .body("updated")
                        .unwrap())
                }
            }
        }
        None => {
            return Ok(Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .body("auth to modify folders")
                .unwrap())
        }
    }
}

async fn delete_folder(
    db_client: DbClient,
    public_id: String,
    user_data: UserDataFromJwt,
) -> Result<impl warp::Reply, warp::Rejection> {
    match user_data.user_data {
        Some(user) => {
            // check if user is owner
            if !folder::is_owned_by_public_id(&db_client, public_id.clone(), user.id).await {
                return Ok(Response::builder()
                    .status(StatusCode::FORBIDDEN)
                    .body("user is not owner")
                    .unwrap());
            }
            // delete folder
            if let Err(_) = folder::delete(&db_client, public_id).await {
                return Ok(Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body("cannot delete folder")
                    .unwrap());
            }
            // response
            match user_data.new_jwt_cookie_values {
                Some((c1, c2)) => {
                    return Ok(Response::builder()
                        .status(StatusCode::OK)
                        .header(SET_COOKIE, c1)
                        .header(SET_COOKIE, c2)
                        .body("deleted")
                        .unwrap())
                }
                None => {
                    return Ok(Response::builder()
                        .status(StatusCode::OK)
                        .body("deleted")
                        .unwrap())
                }
            }
        }
        None => {
            return Ok(Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .body("auth to delete folders")
                .unwrap())
        }
    }
}
