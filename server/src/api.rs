use std::collections::HashSet;
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;
use warp::{hyper::body::Bytes, Filter};
use jwt_simple::prelude::*;
use data_encoding::BASE64URL;
use crate::{state::{Rooms, Board, Room}, with_rooms};


const CONTENT_LENGTH_LIMIT: u64 = 1024 * 16;


pub fn room_filter(rooms: Rooms) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone{
    let room_base = warp::path("rooms");
    
    let create = room_base
        .and(warp::path("create"))
        .and(warp::post())
        .and(as_string(1024 * 1024 * 16))
        .and(with_rooms(rooms.clone()))
        .and_then(create_room);
    let delete = room_base
        .and(warp::path("delete"))
        .and(warp::post())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_rooms(rooms.clone()))
        .and_then(delete_room);

    create.or(delete)
}

#[derive(Deserialize, Serialize)]
struct RoomInitials {
    current: Vec<String>,
    undone: Vec<String>
}

async fn create_room(room_initials: String, rooms: Rooms) -> Result<impl warp::Reply, warp::Rejection>{
    let room: RoomInitials = match serde_json::from_str(&room_initials) {
        Ok(room) => room,
        Err(_) => return Err(warp::reject::reject())
    };
    let public_id = &(Uuid::new_v4().to_string());
    let private_id = BASE64URL.encode(&HS256Key::generate().to_bytes());

    let room = Room {
        public_id: public_id.to_owned(),
        private_id: private_id.to_owned(),
        users: HashSet::new(),
        board: Board {
            current: room.current,
            undone: room.undone
        }
    };
    

    let room_data = json!({
        "public_id": public_id,
        "private_id": private_id
    });

    rooms.write().await.insert(public_id.to_owned(), room);

    Ok(warp::reply::json(&room_data))
}

#[derive(Deserialize, Serialize)]
struct RoomInfo {
    pub public_id: String,
    pub private_id: String,
}

async fn delete_room(room_info: String, rooms: Rooms) -> Result<impl warp::Reply, warp::Rejection>{
    let room_info: RoomInfo = match serde_json::from_str(&room_info) {
        Ok(i) => i,
        Err(_) => return Err(warp::reject::reject())
    };

    match rooms.write().await.get_mut(&room_info.public_id) {
        Some(room) => {
            if room.private_id == room_info.private_id{
                rooms.write().await.remove(&room.public_id);
            }
            else{
                return Err(warp::reject::reject());
            }
            
        },
        None => return Err(warp::reject::reject())
    }

    Ok(warp::reply::json(&json!({"status": "ok", "payload": "room has been deleted"})))
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

