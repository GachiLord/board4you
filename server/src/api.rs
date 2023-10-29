use std::collections::HashSet;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use warp::{hyper::body::Bytes, Filter, http::StatusCode, reply::{WithStatus, Json, with_status, json}};
use jwt_simple::prelude::*;
use data_encoding::BASE64URL;
use crate::{state::{Rooms, Board, Room, BoardSize}, with_rooms};


const CONTENT_LENGTH_LIMIT: u64 = 1024 * 16;


pub fn room_filter(rooms: Rooms) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone{
    let room_base = warp::path("room");
    
    let create = room_base
        .and(warp::post())
        .and(as_string(1024 * 1024 * 16))
        .and(with_rooms(rooms.clone()))
        .and_then(create_room);
    let delete = room_base
        .and(warp::delete())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_rooms(rooms.clone()))
        .and_then(delete_room);

    create.or(delete)
}

#[derive(Deserialize, Serialize)]
struct RoomInitials {
    current: Vec<String>,
    undone: Vec<String>,
    size: BoardSize
}
#[derive(Deserialize, Serialize)]
struct RoomCredentials {
    public_id: String,
    private_id: String,
}
#[derive(Deserialize, Serialize)]
struct ReplyWithPayload{
    message: String,
    payload: String
}

#[derive(Deserialize, Serialize)]
struct Reply{
    message: String,
}

async fn create_room(room_initials: String, rooms: Rooms) -> Result<WithStatus<Json>, warp::Rejection>{
    let room: RoomInitials = match serde_json::from_str(&room_initials) {
        Ok(room) => room,
        Err(e) => return Ok(with_status(json( &ReplyWithPayload{
            message: "cannot parse body".to_string(),
            payload: e.to_string()
        } ), StatusCode::BAD_REQUEST))
    };
    let public_id = Uuid::new_v4().to_string();
    let private_id = BASE64URL.encode(&HS256Key::generate().to_bytes());

    let room = Room {
        public_id: public_id.to_owned(),
        private_id: private_id.to_owned(),
        users: HashSet::new(),
        board: Board {
            current: room.current.iter().map( |e| serde_json::from_str(e).unwrap()).collect(),
            undone: room.undone.iter().map( |e| serde_json::from_str(e).unwrap()).collect(),
            size: room.size
        }
    };
    

    rooms.write().await.insert(public_id.to_owned(), room);

    let room_data = json(&RoomCredentials{
        private_id,
        public_id
    });

    Ok(with_status(room_data, StatusCode::CREATED))
}

#[derive(Deserialize, Serialize)]
struct RoomInfo {
    pub public_id: String,
    pub private_id: String,
}

async fn delete_room(room_info: String, rooms: Rooms) -> Result<WithStatus<Json>, warp::Rejection>{
    let no_such_room = Ok(with_status(
        json( &ReplyWithPayload{
            message: "cannot delete room".to_string(),
            payload: "there is no such room".to_string()
        } ),
        StatusCode::NOT_FOUND,
    ));
    let room_info: RoomInfo = match serde_json::from_str(&room_info) {
        Ok(i) => i,
        Err(_) => return no_such_room

    };

    match rooms.write().await.get_mut(&room_info.public_id) {
        Some(room) => {
            if room.private_id == room_info.private_id{
                rooms.write().await.remove(&room.public_id);
            }
            else{
                return Ok(warp::reply::with_status(
                    json( &Reply{
                        message: "private_id is invalid".to_string(),
                    } ),
                    StatusCode::UNAUTHORIZED,
                ))
            }
            
        },
        None => return no_such_room
    }

    return Ok(with_status(
        json( &Reply{
            message: "room has been deleted".to_string()
        } ),
        StatusCode::OK,
    ))
}


// helpers
fn as_string(
    limit: u64,
) -> impl Filter<Extract = (String,), Error = warp::Rejection> + Clone {
    warp::body::content_length_limit(limit)
        .and(warp::filters::body::bytes())
        .and_then(convert_to_string)
}

async fn convert_to_string(bytes: Bytes) -> Result<String, warp::Rejection> {
    String::from_utf8(bytes.to_vec())
        .map_err(|_| warp::reject())
}

