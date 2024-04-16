use crate::libs::auth::{
    get_jwt_cookies, get_jwt_tokens_from_refresh, retrive_user_data_from_parts,
    verify_access_token, verify_refresh_token, UserData, ACCESS_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_NAME,
};
use crate::AppState;
use axum::async_trait;
use axum::body::Body;
use axum::extract::{FromRef, FromRequestParts, Request, State};
use axum::http::request::Parts;
use axum::http::HeaderMap;
use axum::http::{
    self,
    header::{COOKIE, SET_COOKIE},
    response, StatusCode,
};
use axum::middleware::Next;
use cookie::Cookie;
use serde::{Deserialize, Serialize};
use std::convert::Infallible;
use tokio_postgres::Client;

// constants

const UNAUTHORIZED_MSG: &'static str = "auth to perform this action";
const NOT_FOUND_MSG: &'static str = "resource is not found";
const BAD_REQUEST_MSG: &'static str = "cannot parse the body";
const INTERNAL_SERVER_ERROR_MSG: &'static str = "unexpected server error";
const FORBIDDEN_MSG: &'static str = "insufficient rights to perform this action";

// response generator

pub fn generate_res(code: StatusCode, msg: Option<&str>) -> http::Response<Body> {
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
    return http::Response::builder()
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

#[derive(Deserialize, Serialize)]
pub struct Reply {
    pub message: String,
}

// jwt

pub struct UserDataFromJWT(pub Option<UserData>);

#[async_trait]
impl<S> FromRequestParts<S> for UserDataFromJWT
where
    // keep `S` generic but require that it can produce a `MyLibraryState`
    // this means users will have to implement `FromRef<UserState> for MyLibraryState`
    JwtState: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = Infallible;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let state = JwtState::from_ref(state);
        return Ok(Self(
            retrive_user_data_from_parts(state.client, parts).await,
        ));
    }
}

// the state your library needs
struct JwtState {
    client: &'static Client,
}

impl FromRef<AppState> for JwtState {
    fn from_ref(input: &AppState) -> Self {
        Self {
            client: input.client,
        }
    }
}
/// This functinon accepts the response and returns it with updated jwt_tokens
/// if access_token is expired.
/// * The functinon won't add tokens if they are already set
pub async fn process_jwt(
    State(state): State<AppState>,
    headers: HeaderMap,
    request: Request,
    next: Next,
) -> response::Response<Body> {
    let mut response = next.run(request).await;
    let response_headers = response.headers_mut();
    // if response already has jwt_tokens, do nothing
    let mut has_tokens = false;
    for value in response_headers.get_all(SET_COOKIE) {
        let value = match value.to_str() {
            Ok(v) => v,
            Err(_) => continue,
        };
        if value.contains(ACCESS_TOKEN_COOKIE_NAME) || value.contains(REFRESH_TOKEN_COOKIE_NAME) {
            has_tokens = true;
        }
    }
    // get request cookie header
    let request_cookies = headers.get(COOKIE);
    if has_tokens == false && request_cookies.is_some() {
        let cookies = match request_cookies.unwrap().to_str() {
            Ok(s) => s,
            Err(_) => return response,
        };
        // check if user has valid jwt_tokens
        let mut access_token = None;
        let mut refresh_token = None;
        for c in Cookie::split_parse(cookies).into_iter() {
            if let Ok(c) = c {
                match c.name() {
                    ACCESS_TOKEN_COOKIE_NAME => access_token = Some(c),
                    REFRESH_TOKEN_COOKIE_NAME => refresh_token = Some(c),
                    _ => return response,
                }
            }
        }
        // if access_token is ok, just return the response
        if let Some(c) = access_token {
            if let Ok(_) = verify_access_token(c.value()) {
                return response;
            }
        }
        // otherwise try to update the tokens and add them to the response
        if let Some(c) = refresh_token {
            if let Ok(_) = verify_refresh_token(state.client, c.value()).await {
                match get_jwt_tokens_from_refresh(state.client, c.value()).await {
                    Ok((a_t, r_t, _)) => {
                        let (a_t, r_t) = get_jwt_cookies(&a_t, &r_t, None);
                        response_headers.append(ACCESS_TOKEN_COOKIE_NAME, a_t);
                        response_headers.append(REFRESH_TOKEN_COOKIE_NAME, r_t);
                    }
                    Err(_) => {}
                }
            }
        }
    }

    response
}
