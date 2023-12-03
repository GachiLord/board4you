use std::{sync::Arc, convert::Infallible};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio_postgres::Client;
use uuid::Uuid;
use warp::{hyper::body::Bytes, Filter, http::{StatusCode, Response}, reply::{WithStatus, Json, with_status, json}};
use jwt_simple::prelude::*;
use data_encoding::BASE64URL;
use weak_table::WeakHashSet;
use crate::{state::{Rooms, Board, Room, BoardSize}, with_rooms, user::{User, self}, with_db_client, with_jwt_key, auth::{UserData, verify_access_token, JwtExpired, get_jwt_tokens, get_jwt_tokens_from_refresh, set_jwt_token_response, verify_refresh_token}, with_expired_jwt_tokens};


// common
const CONTENT_LENGTH_LIMIT: u64 = 1024 * 16;

// room
pub fn room_filter(rooms: Rooms, jwt_key: Arc<HS256Key>, expired_jwt_tokens: JwtExpired) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone + '_{
    let room_base = warp::path("room");
    
    let create = room_base
        .and(warp::post())
        .and(as_string(1024 * 1024 * 16))
        .and(with_rooms(rooms.clone()))
        .and(with_user_data(jwt_key, expired_jwt_tokens))
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
        owner_id = Some(data.user_id)
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
            .header("Set-Cookie", a_t)
            .header("Set-Cookie", r_t)
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

// user
pub fn user_filter(client: &Arc<Client>) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone{
    let base_route = warp::path("user");
    
    let create = base_route
        .and(warp::post())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_db_client(client.clone()))
        .and_then(create_user);
    create
}

async fn create_user(user: String, client: Arc<Client>) -> Result<WithStatus<Json>, warp::Rejection>{
    let user: User = match serde_json::from_str(&user) {
        Ok(u) => u,
        Err(e) => return Ok(with_status(json( &ReplyWithPayload{
            message: "cannot parse body".to_string(),
            payload: e.to_string()
        } ), StatusCode::BAD_REQUEST))
    };

    match user::create(&client, &user).await {
        Ok(_) => {
            return Ok(with_status(
                json( &Reply{
                    message: "user created".to_string()
                } ),
                StatusCode::OK,
            ))
        }
        Err(e) => {
            return Ok(with_status(
                json( &Reply{
                    message: e.to_string()
                } ),
                StatusCode::BAD_REQUEST,
            ))
        }
    }
}

// auth

pub fn auth_filter<'a>(client: &Arc<Client>, jwt_key: &Arc<HS256Key>, expired_jwt_tokens: JwtExpired<'a>) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone + 'a{
    let base_route = warp::path("auth");
    
    let login = base_route
        .and(warp::path("login"))
        .and(warp::post())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_db_client(client.clone()))
        .and(with_jwt_key(jwt_key.clone()))
        .and(with_jwt_cookies())
        .and(with_expired_jwt_tokens(expired_jwt_tokens))
        .and_then(login);

    login
}

#[derive(Deserialize)]
struct Credentials{
    login: String,
    password: String
}

async fn login(data: String, client: Arc<Client>, jwt_key: Arc<HS256Key>, access_token: Option<String>, refresh_token: Option<String>, expired_jwt_tokens: JwtExpired<'_>
) -> Result<impl warp::Reply, warp::Rejection>
 {
    // if user is authed, send current tokens
    if let Some(refresh_token) = refresh_token{
        let expired_jwt_tokens = expired_jwt_tokens.write().await;
        if let Ok(_) = verify_refresh_token(&jwt_key, &refresh_token, &expired_jwt_tokens).await {
            let access_token = access_token.unwrap_or_default();
            let reply = warp::reply();
            return Ok(set_jwt_token_response(reply, access_token, refresh_token))
        }
    }
    // else generate new tokens
    let credentials: Credentials = match serde_json::from_str(&data) {
        Ok(u) => u,
        Err(_) => return Err(warp::reject())
    };
    match user::verify_password(&client, &credentials.login, &credentials.password).await {
        Ok(user_id) => {
            let reply = warp::reply();
            let user_data = UserData{ user_id };
            let (a_t, r_t) = get_jwt_tokens(jwt_key.clone(), user_data);
            return Ok(set_jwt_token_response(reply, a_t, r_t))
        }
        Err(_) => {
            return Err(warp::reject())
        }
    }
}

// helpers

fn with_jwt_cookies() -> impl Filter<Extract = (Option<String>,Option<String>), Error = Infallible> + Clone {
    warp::cookie::optional("access_token")
    .and(warp::cookie::optional("refresh_token"))
}

fn with_user_data(jwt_key: Arc<HS256Key>, expired_jwt_tokens: JwtExpired<'_>) -> impl Filter<Extract = (UserDataFromJwt,), Error = Infallible> + Clone + '_
{
    with_jwt_key(jwt_key)
    .and(with_expired_jwt_tokens(expired_jwt_tokens))
    .and(with_jwt_cookies())
    .and_then(retrive_user_data)
}

struct UserDataFromJwt{
    user_data: Option<UserData>,
    new_jwt_cookie_values: Option<(String, String)>
}

async fn retrive_user_data(jwt_key: Arc<HS256Key>, expired_jwt_tokens: JwtExpired<'_>, access_token: Option<String>, refresh_token: Option<String>) -> Result<UserDataFromJwt, Infallible>{
    let some_access_token = access_token.is_some();
    let some_refresh_token = refresh_token.is_some();
    
    if some_access_token{
        if let Ok(user_data) = verify_access_token(jwt_key.clone(), &access_token.unwrap()){
            return Ok(UserDataFromJwt {
                user_data: Some(user_data),
                new_jwt_cookie_values: None
            })
        }
    }
    if some_refresh_token{
        let refresh_token: &'static str = Box::leak(refresh_token.unwrap().into_boxed_str());
        if let Ok((access_token, refresh_token, user_data)) = get_jwt_tokens_from_refresh(jwt_key, refresh_token, expired_jwt_tokens).await {
            return Ok(UserDataFromJwt { 
                user_data: Some(user_data),
                new_jwt_cookie_values: Some((format!("access_token={access_token}"), format!("refresh_token={refresh_token}"))) 
            })
        }
    }
    // if there is no valid tokens return nothing
    Ok(UserDataFromJwt { user_data: None, new_jwt_cookie_values: None })
}

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

// rejecting
#[derive(Serialize)]
struct ErrorMessage {
    code: u16,
    message: String,
}


pub async fn handle_rejection(err: warp::Rejection) -> Result<impl warp::Reply, Infallible> {
    let code;
    let message;

    if err.is_not_found() {
        code = StatusCode::NOT_FOUND;
        message = "NOT_FOUND";
    } else if let Some(_) = err.find::<warp::filters::body::BodyDeserializeError>() {
        // This error happens if the body could not be deserialized correctly
        // We can use the cause to analyze the error and customize the error message
        message = "CANNOT_PARSE_BODY";
        code = StatusCode::BAD_REQUEST;
    } else if let Some(_) = err.find::<warp::reject::MethodNotAllowed>() {
        // We can handle a specific error, here METHOD_NOT_ALLOWED,
        // and render it however we want
        code = StatusCode::METHOD_NOT_ALLOWED;
        message = "METHOD_NOT_ALLOWED";
    } else if let Some(_) = err.find::<warp::reject::Rejection>() {
        code = StatusCode::BAD_REQUEST;
        message = "BAD_REQUEST";
    } else {
        // We should have expected this... Just log and say its a 500
        eprintln!("unhandled rejection: {:?}", err);
        code = StatusCode::INTERNAL_SERVER_ERROR;
        message = "UNHANDLED_REJECTION";
    }

    let json = warp::reply::json(&ErrorMessage {
        code: code.as_u16(),
        message: message.into(),
    });

    Ok(warp::reply::with_status(json, code))
}