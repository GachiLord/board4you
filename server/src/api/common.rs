use crate::libs::auth::{verify_access_token, verify_refresh_token, UserData};
use crate::libs::flood_protection::RateLimit;
use crate::libs::state::{DbClient, JwtKey};
use crate::{with_db_client, with_jwt_key};
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use warp::http::{response::Builder, Response, StatusCode};
use warp::hyper::body::Bytes;
use warp::Filter;

// constants

pub const CONTENT_LENGTH_LIMIT: u64 = 1024 * 16;

const UNAUTHORIZED_MSG: &'static str = "auth to perform this action";
const NOT_FOUND_MSG: &'static str = "resource is not found";
const BAD_REQUEST_MSG: &'static str = "cannot parse the body";
const INTERNAL_SERVER_ERROR_MSG: &'static str = "unexpected server error";
const FORBIDDEN_MSG: &'static str = "insufficient rights to perform this action";

// response generator

fn builder(status_code: StatusCode) -> Builder {
    Response::builder().status(status_code)
}

pub fn generate_res(code: StatusCode, msg: Option<&str>) -> warp::http::Result<Response<String>> {
    match code {
        StatusCode::UNAUTHORIZED => {
            return builder(code).body(msg.unwrap_or(UNAUTHORIZED_MSG).to_string())
        }
        StatusCode::NOT_FOUND => {
            return builder(code).body(msg.unwrap_or(NOT_FOUND_MSG).to_string())
        }
        StatusCode::BAD_REQUEST => {
            return builder(code).body(msg.unwrap_or(BAD_REQUEST_MSG).to_string())
        }
        StatusCode::INTERNAL_SERVER_ERROR => {
            return builder(code).body(msg.unwrap_or(INTERNAL_SERVER_ERROR_MSG).to_string())
        }
        StatusCode::FORBIDDEN => {
            return builder(code).body(msg.unwrap_or(FORBIDDEN_MSG).to_string())
        }
        _ => {
            let msg = match msg {
                Some(msg) => msg.to_string(),
                None => "done".to_string(),
            };
            return builder(StatusCode::OK).body(msg);
        }
    }
}

// structs

#[derive(Deserialize, Serialize)]
pub struct ReplyWithPayload {
    pub message: String,
    pub payload: String,
}

#[derive(Serialize)]
struct ErrorMessage {
    code: u16,
    message: String,
}

#[derive(Debug)]
pub struct UserDataFromJwt {
    pub user_data: Option<UserData>,
    pub new_jwt_cookie_values: Option<(String, String)>,
}

#[derive(Deserialize, Serialize)]
pub struct Reply {
    pub message: String,
}

// helpers
pub fn with_jwt_cookies(
) -> impl Filter<Extract = (Option<String>, Option<String>), Error = Infallible> + Clone {
    warp::cookie::optional("access_token").and(warp::cookie::optional("refresh_token"))
}

/// Extracts UserData if access or refresh token is valid
pub fn with_user_data(
    db_client: &DbClient,
    jwt_key: JwtKey,
) -> impl Filter<Extract = (Option<UserData>,), Error = Infallible> + Clone {
    with_db_client(db_client.clone())
        .and(with_jwt_key(jwt_key))
        .and(with_jwt_cookies())
        .and_then(retrive_user_data)
}

/// Returns UserData if access or refresh token is valid
pub async fn retrive_user_data(
    db_client: DbClient,
    jwt_key: JwtKey,
    access_token: Option<String>,
    refresh_token: Option<String>,
) -> Result<Option<UserData>, Infallible> {
    let some_access_token = access_token.is_some();
    let some_refresh_token = refresh_token.is_some();

    if some_access_token {
        if let Ok(user_data) = verify_access_token(jwt_key.clone(), &access_token.unwrap()) {
            return Ok(Some(user_data));
        }
    }
    if some_refresh_token {
        if let Ok(user_data) =
            verify_refresh_token(&db_client, &jwt_key, &refresh_token.unwrap()).await
        {
            return Ok(Some(user_data));
        }
    }
    // if there is no valid tokens return nothing
    Ok(None)
}

pub fn as_string(limit: u64) -> impl Filter<Extract = (String,), Error = warp::Rejection> + Clone {
    warp::body::content_length_limit(limit)
        .and(warp::filters::body::bytes())
        .and_then(convert_to_string)
}

async fn convert_to_string(bytes: Bytes) -> Result<String, warp::Rejection> {
    String::from_utf8(bytes.to_vec()).map_err(|_| warp::reject())
}

// rejecting

pub async fn handle_rejection(err: warp::Rejection) -> Result<impl warp::Reply, Infallible> {
    let code;
    let message;

    if err.is_not_found() {
        code = StatusCode::NOT_FOUND;
        message = "NOT_FOUND";
    } else if let Some(_) = err.find::<RateLimit>() {
        code = StatusCode::IM_A_TEAPOT;
        message = "I'm a teapot";
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
        code = StatusCode::INTERNAL_SERVER_ERROR;
        message = "UNHANDLED_REJECTION 1";
    }

    let json = warp::reply::json(&ErrorMessage {
        code: code.as_u16(),
        message: message.into(),
    });

    Ok(warp::reply::with_status(json, code))
}
