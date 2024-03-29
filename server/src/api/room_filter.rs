use super::common::{
    as_string, generate_res, with_user_data, Reply, ReplyWithPayload, CONTENT_LENGTH_LIMIT,
};
use crate::{
    entities::{
        board::{self, get_by_owner, save},
        Paginated,
    },
    libs::{
        auth::UserData,
        room::{task, UserMessage},
        state::{Board, BoardSize, DbClient, Edit, JwtKey, Room, Rooms, WSUsers},
    },
    with_db_client, with_rooms, with_ws_users,
};
use data_encoding::BASE64URL;
use jwt_simple::algorithms::HS256Key;
use log::error;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::{mpsc::unbounded_channel, oneshot};
use uuid::Uuid;
use warp::{
    http::Response,
    http::StatusCode,
    reply::{json, with_status, Json, WithStatus},
    Filter,
};
use weak_table::WeakHashSet;

pub fn room_filter(
    ws_users: WSUsers,
    rooms: Rooms,
    db_client: DbClient,
    jwt_key: JwtKey,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    let room_base = warp::path("room");

    let create = room_base
        .and(warp::post())
        .and(as_string(1024 * 1024 * 16))
        .and(with_db_client(db_client.clone()))
        .and(with_rooms(rooms.clone()))
        .and(with_ws_users(ws_users.clone()))
        .and(with_user_data(&db_client, jwt_key.clone()))
        .and_then(create_room);
    let read_own_list = room_base
        .and(warp::get())
        .and(warp::path("own"))
        .and(with_db_client(db_client.clone()))
        .and(with_user_data(&db_client, jwt_key.clone()))
        .and(warp::path::param())
        .and_then(read_own_list);
    let delete = room_base
        .and(warp::delete())
        .and(with_db_client(db_client.clone()))
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_rooms(rooms.clone()))
        .and_then(delete_room);
    let get_private_ids = room_base
        .and(warp::path("private"))
        .and(warp::get())
        .and(with_db_client(db_client.clone()))
        .and(with_user_data(&db_client, jwt_key))
        .and_then(get_private_ids);
    let read_co_editor = room_base
        .and(warp::path("co-editor"))
        .and(warp::path("read"))
        .and(warp::post())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_rooms(rooms.clone()))
        .and_then(read_co_editors);
    let check_co_editor = room_base
        .and(warp::path("co-editor"))
        .and(warp::path("check"))
        .and(warp::post())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_rooms(rooms.clone()))
        .and_then(check_co_editor);
    let update_co_editor = room_base
        .and(warp::path("co-editor"))
        .and(warp::put())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_rooms(rooms))
        .and_then(update_co_editor);

    delete
        .or(read_own_list)
        .or(get_private_ids)
        .or(read_co_editor)
        .or(check_co_editor)
        .or(update_co_editor)
        .or(create)
}

#[derive(Deserialize, Serialize)]
struct RoomInitials {
    current: Vec<Edit>,
    undone: Vec<Edit>,
    size: BoardSize,
    title: String,
}
#[derive(Deserialize, Serialize)]
struct RoomCredentials {
    public_id: String,
    private_id: String,
}

async fn create_room(
    room_initials: String,
    db_client: DbClient,
    rooms: Rooms,
    ws_users: WSUsers,
    user_data: Option<UserData>,
) -> Result<impl warp::Reply, warp::Rejection> {
    // create room from room_initials
    let room: RoomInitials = match serde_json::from_str(&room_initials) {
        Ok(room) => room,
        Err(e) => {
            return Ok(generate_res(
                StatusCode::BAD_REQUEST,
                Some(e.to_string().as_str()),
            ))
        }
    };
    // ids
    let public_id = Uuid::new_v4().to_string();
    let private_id = BASE64URL.encode(&HS256Key::generate().to_bytes());
    let co_editor_private_id = BASE64URL.encode(&HS256Key::generate().to_bytes()) + "_co_editor";
    // owner info
    let mut owner_id: Option<i32> = None;
    // add owner if user is authed
    if let Some(data) = user_data {
        owner_id = Some(data.id)
    }
    // create Room instance
    let room = Room {
        public_id: public_id.to_owned(),
        private_id: private_id.to_owned(),
        users: WeakHashSet::with_capacity(10),
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
        let _ = save(&db_client, &room).await;
    }
    // update rooms
    let (tx, rx) = unbounded_channel();
    let public_id_c = public_id.clone();
    tokio::spawn(async move {
        task(public_id_c, room, &ws_users, &db_client, rx).await;
    });
    rooms.write().await.insert(public_id.to_owned(), tx);
    // response
    let res = Response::builder().status(StatusCode::CREATED).body(
        json!({
                "private_id": private_id,
                "public_id": public_id
        })
        .to_string(),
    );
    Ok(res)
}

async fn read_own_list(
    db_client: DbClient,
    user_data: Option<UserData>,
    page: u16,
) -> Result<impl warp::Reply, warp::Rejection> {
    match user_data {
        Some(user) => {
            let list = get_by_owner(&db_client, page as i64, user.id)
                .await
                .unwrap_or(Paginated {
                    content: vec![],
                    current_page: 1,
                    max_page: 1,
                });

            Ok(Response::builder()
                .status(StatusCode::OK)
                .body(serde_json::to_string(&list).unwrap()))
        }
        None => Ok(generate_res(StatusCode::UNAUTHORIZED, None)),
    }
}

#[derive(Deserialize, Serialize)]
struct RoomInfo {
    pub public_id: String,
    pub private_id: String,
}

async fn delete_room(
    db_client: DbClient,
    room_info: String,
    rooms: Rooms,
) -> Result<WithStatus<Json>, warp::Rejection> {
    let no_such_room = Ok(with_status(
        json(&ReplyWithPayload {
            message: "cannot delete room".to_string(),
            payload: "there is no such room".to_string(),
        }),
        StatusCode::NOT_FOUND,
    ));
    let room_info: RoomInfo = match serde_json::from_str(&room_info) {
        Ok(i) => i,
        Err(_) => return no_such_room,
    };
    // prepare room for delete
    let mut rooms = rooms.write().await;
    match rooms.get_mut(&room_info.public_id) {
        Some(room) => {
            let (tx, rx) = oneshot::channel();
            let _ = room.send(UserMessage::DeleteRoom {
                deleted: tx,
                private_id: room_info.private_id.clone(),
            });
            // check if operation was successful
            if let Ok(res) = rx.await {
                if res {
                    return Ok(warp::reply::with_status(
                        json(&Reply {
                            message: "deleted".to_string(),
                        }),
                        StatusCode::OK,
                    ));
                } else {
                    return Ok(warp::reply::with_status(
                        json(&Reply {
                            message: "private_id is invalid".to_string(),
                        }),
                        StatusCode::UNAUTHORIZED,
                    ));
                }
            }
        }
        None => {
            // if there is no room in the global state, delete it from db
            if let Err(_) =
                board::delete(&db_client, &room_info.public_id, &room_info.private_id).await
            {
                return no_such_room;
            }
        }
    }
    // delete room from global state
    rooms.remove(&room_info.public_id);
    // delete room from db
    let _ = board::delete(&db_client, &room_info.public_id, &room_info.private_id).await;
    // send response
    return Ok(with_status(
        json(&Reply {
            message: "room has been deleted".to_string(),
        }),
        StatusCode::OK,
    ));
}

#[derive(Serialize)]
struct RoomData {
    public_id: String,
    private_id: String,
}

async fn get_private_ids(
    db_client: DbClient,
    jwt_data: Option<UserData>,
) -> Result<impl warp::Reply, warp::Rejection> {
    if let Some(user) = jwt_data {
        let owned_rooms = db_client
            .query(
                "SELECT private_id, public_id FROM boards WHERE owner_id=($1)",
                &[&user.id],
            )
            .await;

        match owned_rooms {
            Ok(rows) => {
                let rooms = rows
                    .iter()
                    .map(|row| {
                        return RoomData {
                            public_id: row.get("public_id"),
                            private_id: row.get("private_id"),
                        };
                    })
                    .collect::<Vec<RoomData>>();
                let body = serde_json::to_string(&rooms).unwrap();
                return Ok(Response::builder().status(StatusCode::OK).body(body));
            }
            Err(e) => {
                error!("{}", e.to_string());
                return Ok(generate_res(StatusCode::INTERNAL_SERVER_ERROR, None));
            }
        }
    }
    return Ok(generate_res(StatusCode::UNAUTHORIZED, None));
}

async fn read_co_editors(
    room_info: String,
    rooms: Rooms,
) -> Result<impl warp::Reply, warp::Rejection> {
    let room_credentials: RoomCredentials = match serde_json::from_str(&room_info) {
        Ok(c) => c,
        Err(_) => return Ok(generate_res(StatusCode::BAD_REQUEST, None)),
    };

    match rooms.read().await.get(&room_credentials.public_id) {
        Some(room) => {
            let (tx, rx) = oneshot::channel();
            let _ = room.send(UserMessage::GetCoEditorToken {
                private_id: room_credentials.private_id,
                sender: tx,
            });
            // check result of operation
            if let Ok(res) = rx.await {
                match res {
                    Ok(id) => {
                        return Ok(Response::builder()
                            .status(StatusCode::OK)
                            .body(json!({ "co_editor_private_id": id }).to_string()))
                    }
                    Err(_) => Ok(generate_res(StatusCode::UNAUTHORIZED, None)),
                }
            } else {
                Ok(generate_res(StatusCode::INTERNAL_SERVER_ERROR, None))
            }
        }
        None => return Ok(generate_res(StatusCode::NOT_FOUND, None)),
    }
}

#[derive(Deserialize)]
struct CheckInfo {
    public_id: String,
    co_editor_private_id: String,
}

async fn check_co_editor(
    check_info: String,
    rooms: Rooms,
) -> Result<impl warp::Reply, warp::Rejection> {
    let check_info: CheckInfo = match serde_json::from_str(&check_info) {
        Ok(c) => c,
        Err(_) => return Ok(generate_res(StatusCode::BAD_REQUEST, None)),
    };

    match rooms.read().await.get(&check_info.public_id) {
        Some(room) => {
            let (tx, rx) = oneshot::channel();
            let _ = room.send(UserMessage::VerifyCoEditorToken {
                token: check_info.co_editor_private_id,
                sender: tx,
            });
            if let Ok(res) = rx.await {
                if res {
                    return Ok(Response::builder()
                        .status(StatusCode::OK)
                        .body(json!({ "valid": true }).to_string()));
                }
            }
            return Ok(Response::builder()
                .status(StatusCode::OK)
                .body(json!({ "valid": false }).to_string()));
        }
        None => Ok(generate_res(StatusCode::NOT_FOUND, None)),
    }
}

async fn update_co_editor(
    room_info: String,
    rooms: Rooms,
) -> Result<impl warp::Reply, warp::Rejection> {
    let room_info: RoomCredentials = match serde_json::from_str(&room_info) {
        Ok(c) => c,
        Err(_) => return Ok(generate_res(StatusCode::BAD_REQUEST, None)),
    };

    match rooms.write().await.get_mut(&room_info.public_id) {
        Some(room) => {
            let (tx, rx) = oneshot::channel();
            let _ = room.send(UserMessage::GetUpdatedCoEditorToken {
                private_id: room_info.private_id,
                sender: tx,
            });
            if let Ok(res) = rx.await {
                if let Ok(token) = res {
                    return Ok(Response::builder()
                        .status(StatusCode::OK)
                        .body(json!({ "co_editor_private_id": token }).to_string()));
                }
            }

            return Ok(generate_res(
                StatusCode::UNAUTHORIZED,
                Some("private_id is invalid"),
            ));
        }
        None => Ok(generate_res(StatusCode::NOT_FOUND, None)),
    }
}
