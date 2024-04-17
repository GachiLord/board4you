use axum::{
    extract::State,
    http::{header::SET_COOKIE, HeaderMap, StatusCode},
    routing::post,
    Json, Router,
};
use serde::Deserialize;

use super::common::UserDataFromJWT;
use crate::{
    entities::user,
    libs::auth::{get_jwt_cookies, get_jwt_cookies_from_user_data, DELETED_COOKIE_VALUE},
    AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/login", post(login))
        .route("/logout", post(logout))
}

#[derive(Deserialize)]
struct Credentials {
    login: Box<str>,
    password: Box<str>,
}

async fn login(
    UserDataFromJWT(user_data): UserDataFromJWT,
    State(state): State<AppState>,
    Json(credentials): Json<Credentials>,
) -> (StatusCode, HeaderMap) {
    // if user is authed, do nothing
    if let Some(_) = user_data {
        return (StatusCode::OK, HeaderMap::new());
    }
    // otherwise generate new tokens
    match user::verify_password(state.client, &credentials.login, credentials.password).await {
        Ok(user) => {
            let mut map = HeaderMap::new();
            let user_data = user;
            let (a_t, r_t) = get_jwt_cookies_from_user_data(user_data, None);
            map.append(SET_COOKIE, a_t);
            map.append(SET_COOKIE, r_t);
            return (StatusCode::OK, map);
        }
        Err(_) => return (StatusCode::UNAUTHORIZED, HeaderMap::new()),
    }
}

async fn logout() -> HeaderMap {
    let mut map = HeaderMap::new();
    let (a_t, r_t) = get_jwt_cookies(
        DELETED_COOKIE_VALUE,
        DELETED_COOKIE_VALUE,
        Some(cookie::time::Duration::ZERO),
    );

    map.append(SET_COOKIE, a_t);
    map.append(SET_COOKIE, r_t);

    map
}
