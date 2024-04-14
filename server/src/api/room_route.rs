use axum::{
    body::Body,
    extract::{DefaultBodyLimit, State},
    http::StatusCode,
    response::Response,
    routing::post,
    Json, Router,
};
use data_encoding::BASE64URL;
use jwt_simple::algorithms::HS256Key;
use serde::{Deserialize, Serialize};
use tokio::sync::{mpsc::unbounded_channel, oneshot};
use uuid::Uuid;
use weak_table::WeakKeyHashMap;

use crate::{
    entities::board::save,
    libs::{
        room::{task, UserMessage},
        state::{Board, BoardSize, Edit, Room},
    },
    AppState,
};

use super::common::generate_res;

const ROOM_INITIAL_LIMIT: usize = 1024 * 1024 * 10;

pub fn router() -> Router<AppState> {
    Router::new()
        .route(
            "/",
            post(create_room).layer(DefaultBodyLimit::max(ROOM_INITIAL_LIMIT)),
        )
        .route("/co-editor/read", post(read_co_editors))
}

#[derive(Deserialize, Serialize)]
struct RoomInitials {
    current: Vec<Edit>,
    undone: Vec<Edit>,
    size: BoardSize,
    title: Box<str>,
}
#[derive(Deserialize, Serialize)]
struct RoomCredentials {
    public_id: Box<str>,
    private_id: Box<str>,
}

async fn create_room(
    State(state): State<AppState>,
    Json(room): Json<RoomInitials>,
    //user_data: Option<UserData>,
) -> (StatusCode, Json<RoomCredentials>) {
    // ids
    let public_id = Uuid::new_v4().to_string().into_boxed_str();
    let private_id = BASE64URL
        .encode(&HS256Key::generate().to_bytes())
        .into_boxed_str();
    let co_editor_private_id =
        (BASE64URL.encode(&HS256Key::generate().to_bytes()) + "_co_editor").into_boxed_str();
    // owner info
    let owner_id: Option<i32> = None;
    // TODO: add owner if user is authed
    //
    //if let Some(data) = user_data {
    //    owner_id = Some(data.id)
    //}
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
                        return Response::builder()
                            .status(StatusCode::OK)
                            .body(Body::from(
                                serde_json::to_string(&CoEditorInfo {
                                    co_editor_private_id: id,
                                })
                                .unwrap(),
                            ))
                            .unwrap();
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
