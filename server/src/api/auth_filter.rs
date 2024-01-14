use super::common::{as_string, with_jwt_cookies, CONTENT_LENGTH_LIMIT};
use crate::{
    entities::user,
    libs::{
        auth::{
            get_access_token_cookie, get_jwt_tokens, set_jwt_token_response, verify_refresh_token,
        },
        state::{DbClient, JwtKey},
    },
    with_db_client, with_jwt_key,
};
use serde::Deserialize;
use warp::Filter;

pub fn auth_filter(
    client: &DbClient,
    jwt_key: &JwtKey,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    let base_route = warp::path("auth");

    let login = base_route
        .and(warp::path("login"))
        .and(warp::post())
        .and(as_string(CONTENT_LENGTH_LIMIT))
        .and(with_db_client(client.clone()))
        .and(with_jwt_key(jwt_key.clone()))
        .and(with_jwt_cookies())
        .and_then(login);
    let logout = base_route
        .and(warp::path("logout"))
        .and(warp::post())
        .and_then(logout);

    login.or(logout)
}

#[derive(Deserialize)]
struct Credentials {
    login: String,
    password: String,
}

async fn login(
    data: String,
    client: DbClient,
    jwt_key: JwtKey,
    access_token: Option<String>,
    refresh_token: Option<String>,
) -> Result<impl warp::Reply, warp::Rejection> {
    // if user is authed, send current tokens
    if let Some(refresh_token) = refresh_token {
        if let Ok(_) = verify_refresh_token(&client, &jwt_key, &refresh_token).await {
            let access_token = access_token.unwrap_or_default();
            let reply = warp::reply();
            return Ok(set_jwt_token_response(reply, access_token, refresh_token));
        }
    }
    // else generate new tokens
    let credentials: Credentials = match serde_json::from_str(&data) {
        Ok(u) => u,
        Err(_) => return Err(warp::reject()),
    };
    match user::verify_password(&client, &credentials.login, &credentials.password).await {
        Ok(user) => {
            let reply = warp::reply();
            let user_data = user;
            let (a_t, r_t) = get_jwt_tokens(jwt_key.clone(), user_data);
            return Ok(set_jwt_token_response(reply, a_t, r_t));
        }
        Err(_) => return Err(warp::reject()),
    }
}

async fn logout() -> Result<impl warp::Reply, warp::Rejection> {
    let reply = warp::reply();
    return Ok(set_jwt_token_response(
        reply,
        get_access_token_cookie("deleted".to_string(), Some(-1)),
        get_access_token_cookie("deleted".to_string(), Some(-1)),
    ));
}

