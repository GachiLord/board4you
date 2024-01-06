mod auth_filter;
mod common;
mod folder_filter;
mod room_filter;
mod user_filter;

use crate::libs::state::{DbClient, JwtKey, Rooms};
use auth_filter::auth_filter;
use folder_filter::folder_filter;
use room_filter::room_filter;
use user_filter::user_filter;
use warp::Filter;

// exports

pub use common::handle_rejection;

pub fn api(
    client: DbClient,
    jwt_key: JwtKey,
    rooms: Rooms,
) -> impl Filter<Extract = impl warp::Reply, Error = warp::Rejection> + Clone {
    warp::path("api").and(
        auth_filter(&client, &jwt_key)
            .or(room_filter(rooms, client.clone(), jwt_key.clone()))
            .or(user_filter(client.clone(), jwt_key.clone()))
            .or(folder_filter(client, jwt_key)),
    )
}
