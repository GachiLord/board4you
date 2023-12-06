use serde::Deserialize;
use warp::Filter;

use crate::{libs::{state::{DbClient, JwtKey}, auth::{JwtExpired, verify_refresh_token, set_jwt_token_response, get_jwt_tokens, get_access_token_cookie}}, with_db_client, with_jwt_key, with_expired_jwt_tokens, entities::user};
use super::common::{CONTENT_LENGTH_LIMIT, as_string, with_jwt_cookies};


pub fn auth_filter<'a>(client: &DbClient, jwt_key: &JwtKey, expired_jwt_tokens: JwtExpired<'a>) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone + 'a{
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
    let logout = base_route
        .and(warp::path("logout"))
        .and(warp::post())
        .and_then(logout);

    login.or(logout)
}

#[derive(Deserialize)]
struct Credentials{
    login: String,
    password: String
}

async fn login(data: String, client: DbClient, jwt_key: JwtKey, access_token: Option<String>, refresh_token: Option<String>, expired_jwt_tokens: JwtExpired<'_>
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
        Ok(user) => {
            let reply = warp::reply();
            let user_data = user; 
            let (a_t, r_t) = get_jwt_tokens(jwt_key.clone(), user_data);
            return Ok(set_jwt_token_response(reply, a_t, r_t))
        }
        Err(_) => {
            return Err(warp::reject())
        }
    }
}

async fn logout() -> Result<impl warp::Reply, warp::Rejection>
{
    let reply = warp::reply();
    return Ok(set_jwt_token_response(
        reply, 
        get_access_token_cookie("deleted".to_string(), Some(-1)), 
        get_access_token_cookie("deleted".to_string(), Some(-1))
    ))
}