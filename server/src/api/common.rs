use crate::libs::auth::UserData;
use axum::body::Body;
use axum::http::response::Builder;
use axum::http::{Response, StatusCode};
use serde::{Deserialize, Serialize};

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

pub fn generate_res(code: StatusCode, msg: Option<&str>) -> Response<Body> {
    let reply_message;

    match code {
        StatusCode::UNAUTHORIZED => {
            reply_message = Some(msg.unwrap_or(UNAUTHORIZED_MSG).to_owned());
        }
        StatusCode::NOT_FOUND => {
            reply_message = Some(msg.unwrap_or(NOT_FOUND_MSG).to_owned());
        }
        StatusCode::BAD_REQUEST => {
            reply_message = Some(msg.unwrap_or(BAD_REQUEST_MSG).to_owned());
        }
        StatusCode::INTERNAL_SERVER_ERROR => {
            reply_message = Some(msg.unwrap_or(INTERNAL_SERVER_ERROR_MSG).to_owned());
        }
        StatusCode::FORBIDDEN => {
            reply_message = Some(msg.unwrap_or(FORBIDDEN_MSG).to_owned());
        }
        _ => {
            let msg = match msg {
                Some(msg) => msg.to_string(),
                None => "no info".to_string(),
            };
            reply_message = Some(msg);
        }
    }
    return Response::builder()
        .status(code)
        .body(Body::from(reply_message.unwrap_or("no info".to_owned())))
        .unwrap();
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
