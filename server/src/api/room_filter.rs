use super::common::{
    as_string, with_user_data, Reply, ReplyWithPayload, UserDataFromJwt, CONTENT_LENGTH_LIMIT,
};
use crate::{
    entities::board::{self, get_by_owner, save},
    libs::state::{Board, BoardSize, DbClient, JwtKey, Room, Rooms, WSUsers},
    websocket::send_all_except_sender,
    with_db_client, with_rooms, with_ws_users,
};
use data_encoding::BASE64URL;
use jwt_simple::algorithms::HS256Key;
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;
use warp::{
    http::header::SET_COOKIE,
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
        .and(with_user_data(&db_client, jwt_key.clone()))
        .and_then(create_room);
    let read_own_list = room_base
        .and(warp::get())
        .and(warp::path("own"))
        .and(with_db_client(db_client.clone()))
        .and(with_user_data(&db_client, jwt_key.clone()))
        .and_then(read_own_list);
    let delete = room_base
        .and(warp::delete())
        .and(with_db_client(db_client.clone()))
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_rooms(rooms.clone()))
        .and(with_ws_users(ws_users.clone()))
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
        .and(with_ws_users(ws_users))
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
    current: Vec<String>,
    undone: Vec<String>,
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
    user_data: UserDataFromJwt,
) -> Result<impl warp::Reply, warp::Rejection> {
    // create room from room_initials
    let room: RoomInitials = match serde_json::from_str(&room_initials) {
        Ok(room) => room,
        Err(e) => {
            let res = Response::builder().status(StatusCode::BAD_REQUEST).body(
                json!({
                    "message": "cannot parse body".to_string(),
                    "payload": e.to_string()
                })
                .to_string(),
            );
            return Ok(res);
        }
    };
    // ids
    let public_id = Uuid::new_v4().to_string();
    let private_id = BASE64URL.encode(&HS256Key::generate().to_bytes());
    let co_editor_private_id = BASE64URL.encode(&HS256Key::generate().to_bytes()) + "_co_editor";
    // owner info
    let mut owner_id: Option<i32> = None;
    // add owner if user is authed
    if let Some(data) = user_data.user_data {
        owner_id = Some(data.id)
    }
    // create Room instance
    let room = Room {
        public_id: public_id.to_owned(),
        private_id: private_id.to_owned(),
        users: WeakHashSet::new(),
        board: Board {
            current: room
                .current
                .iter()
                .map(|e| serde_json::from_str(e).unwrap())
                .collect(),
            undone: room
                .undone
                .iter()
                .map(|e| serde_json::from_str(e).unwrap())
                .collect(),
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
    rooms.write().await.insert(public_id.to_owned(), room);

    // res
    let body = json!({
            "private_id": private_id,
            "public_id": public_id
    })
    .to_string();
    // reply with jwt if neccessary
    if let Some((a_t, r_t)) = user_data.new_jwt_cookie_values {
        let res = Response::builder()
            .status(StatusCode::CREATED)
            .header(SET_COOKIE, a_t)
            .header(SET_COOKIE, r_t)
            .body(body);
        return Ok(res);
    }
    // reply if cant
    let res = Response::builder().status(StatusCode::CREATED).body(body);
    Ok(res)
}

async fn read_own_list(
    db_client: DbClient,
    user_data: UserDataFromJwt,
) -> Result<impl warp::Reply, warp::Rejection> {
    match user_data.user_data {
        Some(user) => {
            let list = get_by_owner(&db_client, user.id).await.unwrap_or(vec![]);

            match user_data.new_jwt_cookie_values {
                Some((c1, c2)) => Ok(Response::builder()
                    .status(StatusCode::OK)
                    .header(SET_COOKIE, c1)
                    .header(SET_COOKIE, c2)
                    .body(serde_json::to_string(&list).unwrap())
                    .unwrap()),
                None => Ok(Response::builder()
                    .status(StatusCode::OK)
                    .body(serde_json::to_string(&list).unwrap())
                    .unwrap()),
            }
        }
        None => Ok(Response::builder()
            .status(StatusCode::UNAUTHORIZED)
            .body("auth to view own boards".to_string())
            .unwrap()),
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
    ws_users: WSUsers,
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
    let ws_users = ws_users.read().await;
    match rooms.get_mut(&room_info.public_id) {
        Some(room) => {
            if &room.private_id == &room_info.private_id {
                // kick users from the room
                let quit_msg = json!({ "QuitData": { "payload": "deleted" } }).to_string();
                send_all_except_sender(ws_users, &room, None, quit_msg);
            } else {
                return Ok(warp::reply::with_status(
                    json(&Reply {
                        message: "private_id is invalid".to_string(),
                    }),
                    StatusCode::UNAUTHORIZED,
                ));
            }
        }
        None => {
            // if there is no room in the global state, delete it now
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
    jwt_data: UserDataFromJwt,
) -> Result<impl warp::Reply, warp::Rejection> {
    if let Some(user) = jwt_data.user_data {
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
                // send with headers
                match jwt_data.new_jwt_cookie_values {
                    Some((c1, c2)) => {
                        return Ok(Response::builder()
                            .header(SET_COOKIE, c1)
                            .header(SET_COOKIE, c2)
                            .status(StatusCode::OK)
                            .body(body))
                    }
                    None => return Ok(Response::builder().status(StatusCode::OK).body(body)),
                }
            }
            Err(e) => {
                println!("{}", e.to_string());
                return Ok(Response::builder()
                    .status(StatusCode::INTERNAL_SERVER_ERROR)
                    .body("unexpected error".to_owned()));
            }
        }
    }
    return Ok(Response::builder()
        .status(StatusCode::UNAUTHORIZED)
        .body("auth to get private_ids".to_owned()));
}

async fn read_co_editors(
    room_info: String,
    rooms: Rooms,
) -> Result<impl warp::Reply, warp::Rejection> {
    let room_credentials: RoomCredentials = match serde_json::from_str(&room_info) {
        Ok(c) => c,
        Err(_) => {
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body("failed to parse body".to_owned())
                .unwrap())
        }
    };

    match rooms.read().await.get(&room_credentials.public_id) {
        Some(room) => {
            if room.private_id == room_credentials.private_id {
                return Ok(Response::builder()
                    .status(StatusCode::OK)
                    .body(
                        json!({ "co_editor_private_id": room.board.co_editor_private_id })
                            .to_string(),
                    )
                    .unwrap());
            }
            return Ok(Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .body("private_id is invalid".to_owned())
                .unwrap());
        }
        None => {
            return Ok(Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body("no such room".to_owned())
                .unwrap())
        }
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
        Err(_) => {
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body("failed to parse body".to_owned())
                .unwrap())
        }
    };

    match rooms.read().await.get(&check_info.public_id) {
        Some(room) => {
            if room.board.co_editor_private_id == check_info.co_editor_private_id {
                return Ok(Response::builder()
                    .status(StatusCode::OK)
                    .body(json!({ "valid": true }).to_string())
                    .unwrap());
            }
            return Ok(Response::builder()
                .status(StatusCode::OK)
                .body(json!({ "valid": false }).to_string())
                .unwrap());
        }
        None => Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body("no such room".to_owned())
            .unwrap()),
    }
}

async fn update_co_editor(
    room_info: String,
    rooms: Rooms,
    ws_users: WSUsers,
) -> Result<impl warp::Reply, warp::Rejection> {
    let room_info: RoomCredentials = match serde_json::from_str(&room_info) {
        Ok(c) => c,
        Err(_) => {
            return Ok(Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body("failed to parse body".to_owned())
                .unwrap())
        }
    };

    match rooms.write().await.get_mut(&room_info.public_id) {
        Some(room) => {
            if room.private_id == room_info.private_id {
                // update co-editor token
                let new_id = room.update_editor_private_id();
                // send update_msg
                let update_msg = json!({ "UpdateCoEditorData": { "payload": "updated" } });
                send_all_except_sender(ws_users.read().await, room, None, update_msg.to_string());
                return Ok(Response::builder()
                    .status(StatusCode::OK)
                    .body(json!({ "co_editor_private_id": new_id }).to_string())
                    .unwrap());
            }
            return Ok(Response::builder()
                .status(StatusCode::UNAUTHORIZED)
                .body("private_id is invalid".to_owned())
                .unwrap());
        }
        None => Ok(Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body("no such room".to_owned())
            .unwrap()),
    }
}
