use crate::AppState;
use axum::{middleware, Router};

use self::common::process_jwt;

mod auth_route;
mod common;
mod room_route;
mod user_route;

pub fn api(state: AppState) -> Router<AppState> {
    Router::new()
        .nest("/room", room_route::router())
        .nest("/auth", auth_route::router())
        .nest("/user", user_route::router())
        .layer(middleware::from_fn_with_state(state, process_jwt))
}
