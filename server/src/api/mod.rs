mod auth_filter;
mod common;
mod folder_filter;
mod room_filter;
mod user_filter;

use crate::libs::auth::{get_jwt_tokens_from_refresh, set_jwt_token_response, verify_access_token};
use crate::libs::state::{DbClient, JwtKey, Rooms, WSUsers};
use auth_filter::auth_filter;
use folder_filter::folder_filter;
use room_filter::room_filter;
use user_filter::user_filter;
use warp::http::header::SET_COOKIE;
use warp::Filter;

// exports

pub use common::handle_rejection;
pub use common::with_jwt_cookies;

pub fn api(
    client: DbClient,
    jwt_key: JwtKey,
    rooms: Rooms,
    ws_users: WSUsers,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path("api").and(
        auth_filter(&client, &jwt_key)
            .or(room_filter(
                ws_users,
                rooms,
                client.clone(),
                jwt_key.clone(),
            ))
            .or(user_filter(client.clone(), jwt_key.clone()))
            .or(folder_filter(client, jwt_key)),
    )
}

/// This functinon accepts the response and returns it with updated jwt_tokens
/// if access_token is expired
pub async fn request_hanlder(
    response: impl warp::Reply,
    db_client: DbClient,
    jwt_key: JwtKey,
    access_token: Option<String>,
    refresh_token: Option<String>,
) -> Result<impl warp::Reply, warp::Rejection> {
    let mut response = response.into_response();
    let headers = response.headers_mut();
    // if response already has jwt_tokens, do nothing
    let mut has_tokens = false;
    for value in headers.get_all(SET_COOKIE) {
        let value = match value.to_str() {
            Ok(v) => v,
            Err(_) => continue,
        };
        if value.contains("access_token") || value.contains("refresh_token") {
            has_tokens = true;
        }
    }
    if has_tokens == false {
        // check if user has valid jwt_tokens
        let some_access_token = access_token.is_some();
        let some_refresh_token = refresh_token.is_some();
        // if access_token is ok, just return the response
        if some_access_token {
            if let Ok(_) = verify_access_token(jwt_key.clone(), &access_token.unwrap()) {
                return Ok(response);
            }
        }
        // otherwise try to update the tokens and add them to the response
        if some_refresh_token {
            if let Ok((access_token, refresh_token, _)) =
                get_jwt_tokens_from_refresh(&db_client, jwt_key, refresh_token.unwrap()).await
            {
                return Ok(set_jwt_token_response(
                    response,
                    access_token,
                    refresh_token,
                ));
            }
        }
    }
    // return modified response
    Ok(response)
}
