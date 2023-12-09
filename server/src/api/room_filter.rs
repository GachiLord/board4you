use data_encoding::BASE64URL;
use jwt_simple::algorithms::HS256Key;
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use warp::{
    Filter, 
    reply::{json, WithStatus, Json, with_status}, 
    http::StatusCode,
    http::Response,
    http::header::SET_COOKIE
};
use weak_table::WeakHashSet;
use crate::{
    libs::state::{Rooms, JwtKey, BoardSize, Room, Board, DbClient}, 
    with_rooms, with_db_client
};
use serde_json::json;
use super::common::{as_string, with_user_data, CONTENT_LENGTH_LIMIT, UserDataFromJwt, ReplyWithPayload, Reply};

pub fn room_filter(rooms: Rooms, db_client: DbClient, jwt_key: JwtKey) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone{
    let room_base = warp::path("room");
    
    let create = room_base
        .and(warp::post())
        .and(as_string(1024 * 1024 * 16))
        .and(with_rooms(rooms.clone()))
        .and(with_user_data(&db_client, jwt_key.clone()))
        .and_then(create_room);
    let delete = room_base
        .and(warp::delete())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_rooms(rooms.clone()))
        .and_then(delete_room);
    let get_private_ids = room_base
        .and(warp::path("private"))
        .and(warp::get())
        .and(with_db_client(db_client.clone()))
        .and(with_user_data(&db_client, jwt_key))
        .and_then(get_private_ids);

    create.or(delete).or(get_private_ids)
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

async fn create_room(room_initials: String, rooms: Rooms, user_data: UserDataFromJwt) -> Result<impl warp::Reply, warp::Rejection>
{
    // create room from room_initials
    let room: RoomInitials = match serde_json::from_str(&room_initials) {
        Ok(room) => room,
        Err(e) => {
            let res = Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(json!({
                    "message": "cannot parse body".to_string(),
                    "payload": e.to_string()
                }).to_string());
            return Ok(res)
        }
    };
    // ids
    let public_id = Uuid::new_v4().to_string();
    let private_id = BASE64URL.encode(&HS256Key::generate().to_bytes());
    // owner info
    let mut owner_id: Option<i32> = None;
    // add owner if user is authed
    if let Some(data) = user_data.user_data{
        owner_id = Some(data.id)
    }
    // create Room instance
    let room = Room {
        public_id: public_id.to_owned(),
        private_id: private_id.to_owned(),
        users: WeakHashSet::new(),
        board: Board {
            current: room.current.iter().map( |e| serde_json::from_str(e).unwrap()).collect(),
            undone: room.undone.iter().map( |e| serde_json::from_str(e).unwrap()).collect(),
            size: room.size
        },
        owner_id
    };
    
    rooms.write().await.insert(public_id.to_owned(), room);

    // res
    let body = json!({
            "private_id": private_id,
            "public_id": public_id
    }).to_string();
    // reply with jwt if neccessary
    if let Some((a_t, r_t)) = user_data.new_jwt_cookie_values{
        let res = Response::builder()
            .status(StatusCode::CREATED)
            .header(SET_COOKIE, a_t)
            .header(SET_COOKIE, r_t)
            .body(body);
        return Ok(res)
    }
    // reply if cant
    let res = Response::builder()
            .status(StatusCode::CREATED)
            .body(body);
    Ok(res)
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

#[derive(Serialize)]
struct RoomData{
    public_id: String,
    private_id: String           
}

async fn get_private_ids(db_client: DbClient, jwt_data: UserDataFromJwt) -> Result<impl warp::Reply, warp::Rejection> {
    if let Some(user) = jwt_data.user_data{
        let owned_rooms =  db_client.query(
            "SELECT private_id, public_id FROM boards WHERE owner_id=($1)", 
            &[&user.id]
        ).await;

        match owned_rooms {
            Ok(rows) => {
                let rooms = rows
                    .iter()
                    .map(|row| {
                        return RoomData { public_id: row.get("public_id"), private_id: row.get("private_id") }
                    } )
                    .collect::<Vec<RoomData>>();
                let body = serde_json::to_string(&rooms).unwrap();
                // send with headers
                match jwt_data.new_jwt_cookie_values {
                    Some((c1, c2)) => return Ok(
                        Response::builder()
                            .header(SET_COOKIE, c1)
                            .header(SET_COOKIE, c2)
                            .status(StatusCode::OK)
                            .body(body)
                    ),
                    None => return Ok(Response::builder().status(StatusCode::OK).body(body))
                }
                }
            Err(e) => {
                println!("{}", e.to_string());
                return Ok(Response::builder().status(StatusCode::INTERNAL_SERVER_ERROR).body("unexpected error".to_owned()))
            }
        }
    }
    return Ok(Response::builder().status(StatusCode::UNAUTHORIZED).body("auth to get private_ids".to_owned()))
}