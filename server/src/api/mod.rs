use crate::AppState;
use axum::Router;

mod common;
mod room_route;

pub fn api() -> Router<AppState> {
    Router::new().nest("/room", room_route::router())
}
