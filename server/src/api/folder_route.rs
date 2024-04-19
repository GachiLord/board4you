use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::Response,
    routing::{delete, get, patch, post},
    Router,
};
use serde::{Deserialize, Serialize};

use crate::{
    entities::folder::{self, FolderInfo},
    AppState,
};

use super::common::{generate_res, generate_res_json, UserDataFromJWT};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_folder))
        .route("/:public_id", get(read_folder))
        .route("/own/:page", get(read_own_folders_list))
        .route("/", patch(update_folder_contents))
        .route("/:public_id", delete(delete_folder))
}

#[derive(Deserialize)]
struct FolderInitials {
    title: Box<str>,
}

#[derive(Serialize)]
struct FolderData {
    public_id: Box<str>,
}

async fn create_folder(
    State(state): State<AppState>,
    UserDataFromJWT(user_data): UserDataFromJWT,
    Json(folder): Json<FolderInitials>,
) -> Response {
    if folder.title.len() > 36 {
        return generate_res(StatusCode::BAD_REQUEST, Some("title is too long"));
    }
    // create folder
    match user_data {
        Some(data) => match folder::create(&state.pool.get().await, &folder.title, data.id).await {
            Ok(public_id) => {
                return generate_res_json(FolderData {
                    public_id: public_id.to_string().into_boxed_str(),
                })
            }
            Err(_) => return generate_res(StatusCode::INTERNAL_SERVER_ERROR, None),
        },
        None => return generate_res(StatusCode::UNAUTHORIZED, None),
    }
}

async fn read_folder(
    State(state): State<AppState>,
    UserDataFromJWT(user_data): UserDataFromJWT,
    Path(public_id): Path<Box<str>>,
) -> Response {
    let user_id = match user_data {
        Some(user) => Some(user.id),
        None => None,
    };
    match folder::read(&state.pool.get().await, &public_id, user_id).await {
        Some(folder) => generate_res_json(folder),
        None => generate_res(StatusCode::NOT_FOUND, None),
    }
}

async fn read_own_folders_list(
    State(state): State<AppState>,
    UserDataFromJWT(user_data): UserDataFromJWT,
    Path(page): Path<u16>,
) -> Response {
    match user_data {
        Some(user) => {
            let folder_list =
                folder::read_list_by_owner(&state.pool.get().await, page as i64, user.id).await;

            return generate_res_json(folder_list);
        }
        None => return generate_res(StatusCode::UNAUTHORIZED, None),
    }
}

async fn update_folder_contents(
    State(state): State<AppState>,
    UserDataFromJWT(user_data): UserDataFromJWT,
    Json(folder_info): Json<FolderInfo>,
) -> Response {
    if folder_info.title.len() > 36 {
        return generate_res(StatusCode::OK, Some("title is too long"));
    }
    let client = state.pool.get().await;

    match user_data {
        Some(user) => {
            // check if user is owner
            if !folder::is_owned_by_public_id(&client, &folder_info.public_id, user.id).await {
                return generate_res(StatusCode::FORBIDDEN, Some("user is not owner"));
            }
            // update folder
            if let Err(_) = folder::update(&client, folder_info).await {
                return generate_res(StatusCode::INTERNAL_SERVER_ERROR, None);
            }
            return generate_res(StatusCode::OK, Some("updated"));
        }
        None => return generate_res(StatusCode::UNAUTHORIZED, None),
    }
}

async fn delete_folder(
    State(state): State<AppState>,
    UserDataFromJWT(user_data): UserDataFromJWT,
    Path(public_id): Path<Box<str>>,
) -> Response {
    let client = state.pool.get().await;
    match user_data {
        Some(user) => {
            // check if user is owner
            if !folder::is_owned_by_public_id(&client, &public_id, user.id).await {
                return generate_res(StatusCode::FORBIDDEN, Some("user is not owner"));
            }
            // delete folder
            if let Err(_) = folder::delete(&client, &public_id).await {
                return generate_res(StatusCode::NOT_FOUND, Some("no such folder"));
            }
            // response
            return generate_res(StatusCode::OK, Some("deleted"));
        }
        None => return generate_res(StatusCode::UNAUTHORIZED, None),
    }
}
