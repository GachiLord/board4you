use std::time::SystemTime;

use axum::{
    extract::{DefaultBodyLimit, Path, State},
    http::StatusCode,
    response::Response,
    routing::{delete, get, post, put},
    Json, Router,
};
use futures::future::join;
use log::{debug, error, info};
use protocol::board_protocol::{BoardSize, Edit};
use serde::{Deserialize, Serialize};
use tokio::sync::{mpsc::channel, oneshot};
use uuid::Uuid;

use crate::{
    entities::{
        board::{self, get_by_owner, RoomCredentials},
        edit::EditStatus,
        Paginated,
    },
    libs::{
        db_queue::{BoardCreateChunk, EditCreateChunk},
        room::{task, UserMessage},
        state::{Board, Room},
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
    Json(room_init): Json<RoomInitials>,
) -> Response {
    // validate edits
    for edit in room_init.current.iter() {
        if let Err(e) = Board::validate_edit(edit) {
            return generate_res(StatusCode::BAD_REQUEST, Some(&e.to_string()));
        }
    }
    for edit in room_init.undone.iter() {
        if let Err(e) = Board::validate_edit(edit) {
            return generate_res(StatusCode::BAD_REQUEST, Some(&e.to_string()));
        }
    }
    // validate size
    if let Err(e) = Board::validate_size(room_init.size.height, room_init.size.width) {
        return generate_res(StatusCode::BAD_REQUEST, Some(&e.to_string()));
    }
    // validate title
    if let Err(e) = Board::validate_title(&room_init.title) {
        return generate_res(StatusCode::BAD_REQUEST, Some(&e.to_string()));
    }
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
    let board = Board::new(state.db_queue, room_init.title, room_init.size);
    let room = Room::new(board).await;
    let (public_id, private_id) = (room.public_id(), room.private_id().into());
    // get client
    let now = SystemTime::now();
    // create board record
    let (tx, rx) = oneshot::channel();
    let _ = state
        .db_queue
        .create_board
        .send(BoardCreateChunk {
            public_id: room.public_id(),
            private_id: room.private_id().into(),
            title: room.title().into(),
            owner_id,
            ready: tx,
        })
        .await;
    let _ = rx.await;
    // create edit records
    let (tx1, rx1) = oneshot::channel();
    let (tx2, rx2) = oneshot::channel();
    let _ = join(
        state.db_queue.create_edit.send(EditCreateChunk {
            public_id: room.public_id(),
            status: EditStatus::Current,
            items: room_init
                .current
                .into_iter()
                .map(|edit| (now, edit))
                .collect(),
            ready: tx1,
        }),
        state.db_queue.create_edit.send(EditCreateChunk {
            public_id: room.public_id(),
            status: EditStatus::Undone,
            items: room_init
                .undone
                .into_iter()
                .map(|edit| (now, edit))
                .collect(),
            ready: tx2,
        }),
    )
    .await;
    let _ = join(rx1, rx2).await;
    // update rooms
    let (tx, rx) = channel(1);
    tokio::spawn(async move {
        task(public_id, room, &state.pool, state.db_queue, rx).await;
    });
    state.rooms.write().await.insert(public_id, tx);
    info!("Created room with public_id: {}", public_id);
    // response
    return generate_res_json(RoomCredentials {
        public_id: public_id.to_string().into_boxed_str(),
        private_id,
    });
}

async fn read_own_list(
    State(state): State<AppState>,
    UserDataFromJWT(user_data): UserDataFromJWT,
    Path(page): Path<u64>,
) -> Response {
    match user_data {
        Some(user) => {
            let list = get_by_owner(&state.pool.get().await, page as i64, user.id)
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
    let id = match Uuid::try_parse(&room_info.public_id) {
        Ok(id) => id,
        Err(_) => return generate_res(StatusCode::BAD_REQUEST, Some("Not a uuid")),
    };
    // get client
    let client = state.pool.get().await;
    // prepare room for delete
    let rooms = state.rooms.read().await;

    match rooms.get(&id) {
        Some(room) => {
            let (tx, rx) = oneshot::channel();
            let _ = room
                .send(UserMessage::DeleteRoom {
                    deleted: tx,
                    private_id: room_info.private_id.clone(),
                })
                .await;
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
            if let Err(_) = board::delete(&client, id, &room_info.private_id).await {
                return generate_res(StatusCode::NOT_FOUND, Some("no such room"));
            }
            // response instantly to avoid locking the RwLock
            return generate_res(StatusCode::OK, Some("deleted"));
        }
    }
    // drop read lock and create write lock
    drop(rooms);
    let mut rooms = state.rooms.write().await;
    // delete room from global state
    rooms.remove(&id);
    // delete room from db
    let _ = board::delete(&client, id, &room_info.private_id).await;
    // send response
    return generate_res(StatusCode::OK, Some("deleted"));
}

async fn get_private_ids(
    State(state): State<AppState>,
    UserDataFromJWT(user_data): UserDataFromJWT,
) -> Response {
    match user_data {
        Some(user) => match board::get_private_ids(&state.pool.get().await, user.id).await {
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
    let id = match Uuid::try_parse(&room.public_id) {
        Ok(id) => id,
        Err(_) => return generate_res(StatusCode::BAD_REQUEST, Some("Not a uuid")),
    };

    match state.rooms.read().await.get(&id) {
        Some(room_chan) => {
            let (tx, rx) = oneshot::channel();
            let _ = room_chan
                .send(UserMessage::GetCoEditorToken {
                    private_id: room.private_id,
                    sender: tx,
                })
                .await;
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
    let id = match Uuid::try_parse(&check_info.public_id) {
        Ok(id) => id,
        Err(_) => return generate_res(StatusCode::BAD_REQUEST, Some("Not a uuid")),
    };
    match state.rooms.read().await.get(&id) {
        Some(room) => {
            let (tx, rx) = oneshot::channel();
            let _ = room
                .send(UserMessage::VerifyCoEditorToken {
                    token: check_info.co_editor_private_id,
                    sender: tx,
                })
                .await;
            if let Ok(res) = rx.await {
                return generate_res_json(CheckResult { valid: res });
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
    let id = match Uuid::try_parse(&room_info.public_id) {
        Ok(id) => id,
        Err(_) => return generate_res(StatusCode::BAD_REQUEST, Some("Not a uuid")),
    };
    match state.rooms.write().await.get_mut(&id) {
        Some(room) => {
            let (tx, rx) = oneshot::channel();
            let _ = room
                .send(UserMessage::GetUpdatedCoEditorToken {
                    private_id: room_info.private_id,
                    sender: tx,
                })
                .await;
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
