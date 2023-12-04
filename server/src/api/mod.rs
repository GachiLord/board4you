mod auth_filter;
mod room_filter;
mod user_filter;
mod common;

use auth_filter::auth_filter;
use room_filter::room_filter;
use user_filter::user_filter;
use warp::Filter;

use crate::libs::{state::{DbClient, JwtKey, Rooms}, auth::JwtExpired};

// exports

pub use common::handle_rejection;

pub fn api(client: DbClient, jwt_key: JwtKey, expired_jwt_tokens: JwtExpired, rooms: Rooms) 
-> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone + '_
{
    auth_filter(&client, &jwt_key, expired_jwt_tokens.clone())
    .or(room_filter(rooms, jwt_key, expired_jwt_tokens))
    .or(user_filter(&client))
}