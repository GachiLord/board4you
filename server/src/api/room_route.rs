use axum::{
    extract::{DefaultBodyLimit, Path, State},
    http::StatusCode,
    response::Response,
    routing::{delete, get, post, put},
    Json, Router,
};
use data_encoding::BASE64URL;
use jwt_simple::algorithms::HS256Key;
use log::{debug, error};
use serde::{Deserialize, Serialize};
use tokio::sync::{mpsc::unbounded_channel, oneshot};
use uuid::Uuid;
use weak_table::WeakKeyHashMap;

use crate::{
    entities::{
        board::{self, get_by_owner, save, RoomCredentials},
        Paginated,
    },
    libs::{
        room::{task, UserMessage},
        state::{Board, BoardSize, Edit, Room},
    },
    AppState,
};

use super::common::{generate_res, generate_res_json, UserDataFromJWT};

const ROOM_INITIAL_LIMIT: usize = 1024 * 1024 * 10;

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/",
            post(create_room).layer(DefaultBodyLimit::max(ROOM_INITIAL_LIMIT)),
        )
        .route("/", delete(delete_room))
        .route("/own/:page", get(read_own_list))
        .route("/private", get(get_private_ids))
        .route("/co-editor/check", post(check_co_editor))
        .route("/co-editor", put(update_co_editor))
        .route("/co-editor/read", post(read_co_editors))
}

#[derive(Deserialize, Serialize)]
struct RoomInitials {
    current: Vec<Edit>,
    undone: Vec<Edit>,
    size: BoardSize,
    title: Box<str>,
}

async fn create_room(
    State(state): State<AppState>,
    UserDataFromJWT(user_data): UserDataFromJWT,
    Json(room): Json<RoomInitials>,
) -> (StatusCode, Json<RoomCredentials>) {
    // ids
    let (tx, rx) = oneshot::channel();
    // use blocking task because these ops are CPU-bound
    tokio::task::spawn_blocking(move || {
        let public_id = Uuid::new_v4().to_string().into_boxed_str();
        let private_id = BASE64URL
            .encode(&HS256Key::generate().to_bytes())
            .into_boxed_str();
        let co_editor_private_id =
            (BASE64URL.encode(&HS256Key::generate().to_bytes()) + "_co_editor").into_boxed_str();
        let _ = tx.send((public_id, private_id, co_editor_private_id));
    });
    let (public_id, private_id, co_editor_private_id) = rx.await.expect("failed to create ids");
    // owner info
    let mut owner_id: Option<i32> = None;
    //add owner if user is authed
    if let Some(data) = user_data {
        owner_id = Some(data.id);
        debug!(
            "user with public_login '{}' has just created a room",
            data.public_login
        );
    }
    // create Room instance
    let room = Room {
        public_id: public_id.to_owned(),
        private_id: private_id.to_owned(),
        users: WeakKeyHashMap::with_capacity(10),
        board: Board {
            current: room.current,
            undone: room.undone,
            size: room.size,
            title: room.title,
            co_editor_private_id,
        },
        owner_id,
    };
    // save board to db if user is authed
    if let Some(_) = owner_id {
        let _ = save(state.client, &room).await;
    }
    // update rooms
    let (tx, rx) = unbounded_channel();
    let public_id_c = public_id.clone();
    tokio::spawn(async move {
        task(public_id_c, room, state.client, rx).await;
    });
    state.rooms.write().await.insert(public_id.to_owned(), tx);
    // response
    return (
        StatusCode::OK,
        Json(RoomCredentials {
            public_id,
            private_id,
        }),
    );
}

async fn read_own_list(
    State(state): State<AppState>,
    UserDataFromJWT(user_data): UserDataFromJWT,
    Path(page): Path<u64>,
) -> Response {
    match user_data {
        Some(user) => {
            let list = get_by_owner(state.client, page as i64, user.id)
                .await
                .unwrap_or(Paginated {
                    content: vec![],
                    current_page: 1,
                    max_page: 1,
                });

            generate_res_json(list)
        }
        None => generate_res(StatusCode::UNAUTHORIZED, None),
    }
}

async fn delete_room(
    State(state): State<AppState>,
    Json(room_info): Json<RoomCredentials>,
) -> Response {
    // prepare room for delete
    let mut rooms = state.rooms.write().await;
    match rooms.get_mut(&room_info.public_id) {
        Some(room) => {
            let (tx, rx) = oneshot::channel();
            let _ = room.send(UserMessage::DeleteRoom {
                deleted: tx,
                private_id: room_info.private_id.clone(),
            });
            // check if operation was successful
            match rx.await {
                Ok(res) => {
                    if !res {
                        return generate_res(
                            StatusCode::UNAUTHORIZED,
                            Some("private_id is invalid"),
                        );
                    }
                }
                Err(err) => {
                    error!("cannot receive the DeleteRoom result: {err}");
                    return generate_res(StatusCode::INTERNAL_SERVER_ERROR, None);
                }
            }
        }
        None => {
            // if there is no room in the global state, delete it from db
            if let Err(_) =
                board::delete(state.client, &room_info.public_id, &room_info.private_id).await
            {
                return generate_res(StatusCode::NOT_FOUND, Some("no such room"));
            }
        }
    }
    // delete room from global state
    rooms.remove(&room_info.public_id);
    // delete room from db
    let _ = board::delete(state.client, &room_info.public_id, &room_info.private_id).await;
    // send response
    return generate_res(StatusCode::OK, Some("deleted"));
}

async fn get_private_ids(
    State(state): State<AppState>,
    UserDataFromJWT(user_data): UserDataFromJWT,
) -> Response {
    match user_data {
        Some(user) => match board::get_private_ids(state.client, user.id).await {
            Ok(ids) => return generate_res_json(ids),
            Err(_) => return generate_res(StatusCode::INTERNAL_SERVER_ERROR, None),
        },
        None => return generate_res(StatusCode::UNAUTHORIZED, None),
    }
}

#[derive(Serialize)]
struct CoEditorInfo {
    co_editor_private_id: Box<str>,
}

async fn read_co_editors(
    State(state): State<AppState>,
    Json(room): Json<RoomCredentials>,
) -> Response {
    match state.rooms.read().await.get(&room.public_id) {
        Some(room_chan) => {
            let (tx, rx) = oneshot::channel();
            let _ = room_chan.send(UserMessage::GetCoEditorToken {
                private_id: room.private_id,
                sender: tx,
            });
            // check result of operation
            if let Ok(res) = rx.await {
                match res {
                    Ok(id) => {
                        return generate_res_json(CoEditorInfo {
                            co_editor_private_id: id,
                        })
                    }
                    Err(_) => return generate_res(StatusCode::UNAUTHORIZED, None),
                }
            } else {
                generate_res(StatusCode::INTERNAL_SERVER_ERROR, None)
            }
        }
        None => return generate_res(StatusCode::NOT_FOUND, None),
    }
}

#[derive(Deserialize)]
struct CheckInfo {
    public_id: Box<str>,
    co_editor_private_id: Box<str>,
}

#[derive(Deserialize, Serialize)]
struct CheckResult {
    valid: bool,
}

async fn check_co_editor(
    State(state): State<AppState>,
    Json(check_info): Json<CheckInfo>,
) -> Response {
    match state.rooms.read().await.get(&check_info.public_id) {
        Some(room) => {
            let (tx, rx) = oneshot::channel();
            let _ = room.send(UserMessage::VerifyCoEditorToken {
                token: check_info.co_editor_private_id,
                sender: tx,
            });
            if let Ok(res) = rx.await {
                if res {
                    return generate_res_json(CheckResult { valid: true });
                }
            }
            return generate_res_json(CheckResult { valid: false });
        }
        None => generate_res(StatusCode::NOT_FOUND, None),
    }
}

async fn update_co_editor(
    State(state): State<AppState>,
    Json(room_info): Json<RoomCredentials>,
) -> Response {
    match state.rooms.write().await.get_mut(&room_info.public_id) {
        Some(room) => {
            let (tx, rx) = oneshot::channel();
            let _ = room.send(UserMessage::GetUpdatedCoEditorToken {
                private_id: room_info.private_id,
                sender: tx,
            });
            if let Ok(res) = rx.await {
                if let Ok(token) = res {
                    return generate_res_json(CoEditorInfo {
                        co_editor_private_id: token,
                    });
                }
            }

            return generate_res(StatusCode::UNAUTHORIZED, Some("private_id is invalid"));
        }
        None => generate_res(StatusCode::NOT_FOUND, None),
    }
}
