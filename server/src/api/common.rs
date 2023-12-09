use std::convert::Infallible;
use warp::http::StatusCode;
use warp::Filter;
use warp::hyper::body::Bytes;
use serde::{Serialize, Deserialize};

use crate::libs::auth::{
    UserData, 
    verify_access_token, 
    get_jwt_tokens_from_refresh, 
    get_access_token_cookie, 
    get_refresh_token_cookie
};
use crate::libs::state::{JwtKey, DbClient};
use crate::{with_jwt_key, with_db_client};

// structs

pub const CONTENT_LENGTH_LIMIT: u64 = 1024 * 16;

#[derive(Deserialize, Serialize)]
pub struct ReplyWithPayload{
    pub message: String,
    pub payload: String
}

#[derive(Serialize)]
struct ErrorMessage {
    code: u16,
    message: String,
}

#[derive(Debug)]
pub struct UserDataFromJwt{
    pub user_data: Option<UserData>,
    pub new_jwt_cookie_values: Option<(String, String)>
}

#[derive(Deserialize, Serialize)]
pub struct Reply{
    pub message: String,
}

// helpers
pub fn with_jwt_cookies() -> impl Filter<Extract = (Option<String>,Option<String>), Error = Infallible> + Clone {
    warp::cookie::optional("access_token")
    .and(warp::cookie::optional("refresh_token"))
}

pub fn with_user_data(db_client: &DbClient, jwt_key: JwtKey) -> impl Filter<Extract = (UserDataFromJwt,), Error = Infallible> + Clone
{
    with_db_client(db_client.clone())
    .and(with_jwt_key(jwt_key))
    .and(with_jwt_cookies())
    .and_then(retrive_user_data)
}

pub async fn retrive_user_data(db_client: DbClient, jwt_key: JwtKey, access_token: Option<String>, refresh_token: Option<String>) -> Result<UserDataFromJwt, Infallible>{
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
        if let Ok((access_token, refresh_token, user_data)) = get_jwt_tokens_from_refresh(&db_client, jwt_key, &refresh_token).await {
            return Ok(UserDataFromJwt { 
                user_data: Some(user_data),
                new_jwt_cookie_values: Some(( get_access_token_cookie(access_token, None), get_refresh_token_cookie(refresh_token, None) ))
            })
        }
    }
    // if there is no valid tokens return nothing
    Ok(UserDataFromJwt { user_data: None, new_jwt_cookie_values: None })
}

pub fn as_string(
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