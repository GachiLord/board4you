use axum::{
    body::Body,
    extract::{Path, State},
    http::{
        header::{COOKIE, SET_COOKIE},
        HeaderMap, StatusCode,
    },
    response::{IntoResponse, Response},
    routing::{delete, get, post, put},
    Json, Router,
};
use log::debug;
use serde::{Deserialize, Serialize};

use super::common::{generate_res, generate_res_json, UserDataFromJWT};
use crate::{
    entities::{
        jwt,
        user::{self, read_by_public_login, verify_password, User},
    },
    libs::auth::{
        expire_refresh_token, get_jwt_cookies, get_jwt_cookies_from_user_data, retrive_jwt_cookies,
        verify_refresh_token, UserData, DELETED_COOKIE_VALUE,
    },
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_user))
        .route("/:public_login", get(read_user))
        .route("/private", post(read_user_private))
        .route("/", put(update_user))
        .route("/", delete(delete_user))
}

async fn create_user(State(state): State<AppState>, Json(user): Json<User>) -> Response {
    match user::create(&state.pool.get().await, &user).await {
        Ok(_) => return generate_res(StatusCode::OK, Some("created")),
        Err(e) => return generate_res(StatusCode::BAD_REQUEST, Some(&e.to_string())),
    }
}

#[derive(Serialize, Deserialize)]
struct UserInfo {
    public_login: Box<str>,
}

async fn read_user(State(state): State<AppState>, Path(public_login): Path<Box<str>>) -> Response {
    match read_by_public_login(&state.pool.get().await, &public_login).await {
        Ok(info) => return generate_res_json(info),
        Err(_) => return generate_res(StatusCode::NOT_FOUND, Some("user is not found")),
    }
}

#[derive(Deserialize)]
struct UpdateData {
    user: User,
    login: Box<str>,
    password: Box<str>,
}

async fn update_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(update_data): Json<UpdateData>,
) -> Response {
    let cookie = match headers.get(COOKIE) {
        Some(c) => c,
        None => return generate_res(StatusCode::UNAUTHORIZED, None),
    };
    let (_, refresh_token) = retrive_jwt_cookies(cookie);
    // get client
    let client = state.pool.get().await;
    // verify password to decide whether we expire the token or not
    if let Err(_) = user::verify_password(&client, &update_data.login, update_data.password).await {
        return generate_res(StatusCode::BAD_REQUEST, Some("wrong password"));
    }
    match refresh_token {
        Some(token) => match expire_refresh_token(&client, &token.value()).await {
            Ok(user) => {
                // update user
                if let Err(e) = user::update(&client, &update_data.user, user.id).await {
                    return generate_res(StatusCode::BAD_REQUEST, Some(&e.to_string()));
                }
                // update cookies
                let user = UserData {
                    id: user.id,
                    login: update_data.user.login,
                    public_login: update_data.user.public_login,
                    first_name: update_data.user.first_name,
                    second_name: update_data.user.second_name,
                };
                let (a_t, r_t) = get_jwt_cookies_from_user_data(user, None);
                return Response::builder()
                    .status(StatusCode::OK)
                    .header(SET_COOKIE, a_t)
                    .header(SET_COOKIE, r_t)
                    .body(Body::from("updated"))
                    .unwrap();
            }
            Err(e) => {
                debug!("connot expire a token: {e}");
                return generate_res(StatusCode::INTERNAL_SERVER_ERROR, None);
            }
        },
        None => {
            return generate_res(StatusCode::UNAUTHORIZED, None);
        }
    }
}

#[derive(Deserialize)]
pub(crate) struct DeleteData {
    password: Box<str>,
}
pub async fn delete_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(delete_data): Json<DeleteData>,
) -> Response {
    let cookie = match headers.get(COOKIE) {
        Some(c) => c,
        None => return generate_res(StatusCode::UNAUTHORIZED, None),
    };
    let (_, refresh_token) = retrive_jwt_cookies(cookie);
    if refresh_token.is_none() {
        return generate_res(StatusCode::UNAUTHORIZED, None);
    }
    let refresh_token = refresh_token.unwrap();
    // get client
    let client = state.pool.get().await;

    match verify_refresh_token(&client, &refresh_token.value()).await {
        Ok(user) => {
            match verify_password(&client, &user.login, delete_data.password).await {
                Ok(_) => {
                    // expire token
                    let _ = jwt::create(&client, &refresh_token.value()).await;
                    // set cookies
                    let (c_1, c_2) =
                        get_jwt_cookies(DELETED_COOKIE_VALUE, DELETED_COOKIE_VALUE, None);
                    match user::delete(&client, user.id).await {
                        Ok(_) => {
                            return Response::builder()
                                .status(StatusCode::OK)
                                .header(SET_COOKIE, c_1)
                                .header(SET_COOKIE, c_2)
                                .body(Body::from("deleted"))
                                .unwrap()
                        }
                        Err(_) => return generate_res(StatusCode::INTERNAL_SERVER_ERROR, None),
                    }
                }
                Err(_) => return generate_res(StatusCode::BAD_REQUEST, Some("wrong password")),
            }
        }
        Err(_) => return generate_res(StatusCode::UNAUTHORIZED, None),
    }
}

async fn read_user_private(UserDataFromJWT(user): UserDataFromJWT) -> impl IntoResponse {
    if let Some(user) = user {
        return generate_res_json(user);
    }
    return generate_res(StatusCode::UNAUTHORIZED, None);
}
