use std::convert::Infallible;
use std::env;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::path::Path;
use tokio::signal::unix::signal;
use tokio::time;
use warp::Filter;
// modules
mod message;
mod state;
mod api;
mod connect;
mod cleanup;
use connect::user_connected;
use crate::state::{Rooms, WSUsers};
use crate::api::room_filter;
use crate::cleanup::remove_unused_rooms;

// unique id
static NEXT_USER_ID: AtomicUsize = AtomicUsize::new(1);

#[tokio::main]
async fn main() {
    // create state of the app
    let users = WSUsers::default();
    let rooms = Rooms::default();
    // filters for Rc
    // ws route
    let board = warp::path("board")
        .and(warp::ws())
        .and(with_ws_users(users))
        .and(with_rooms(rooms.clone()))
        .map(move |ws: warp::ws::Ws, users, rooms| {
            ws.on_upgrade(move |socket| user_connected(NEXT_USER_ID.fetch_add(1, Ordering::Relaxed), socket, users, rooms))
        });
    // static paths
    let public_path = &env::var("PUBLIC_PATH").expect("$PUBLIC_PATH must be provided");
    let index_path = Path::new(&public_path).join("web.html");
    // routing static files
    let default_route = warp::fs::file(index_path);
    let static_site = warp::fs::dir(public_path.to_owned()).or(default_route);
    // apis
    let apis = room_filter(rooms.clone());
    // bundle all routes
    let routes = apis.or(board).or(static_site);
    // create cleanup task to remove unuesed rooms
    let cleanup_interval: u64 = match &env::var("CLEANUP_INTERVAL_MINUTES"){
        Ok(t) => t.parse().expect("$CLEANUP_INTERVAL_MINUTES must be u64 number"),
        Err(_) => 30
    };
    tokio::spawn(async move {
        remove_unused_rooms(&rooms, time::Duration::from_secs(cleanup_interval * 60)).await;
    });
    // run server
    let mut stream = signal(tokio::signal::unix::SignalKind::terminate()).unwrap();
    let (_, server) = warp::serve(routes)
        .bind_with_graceful_shutdown(([0, 0, 0, 0], 3000), async move {
            stream.recv().await
                .expect("failed to listen to shutdown signal");
    });
    server.await;
}


pub fn with_ws_users(users: WSUsers) -> impl Filter<Extract = (WSUsers,), Error = Infallible> + Clone {
    warp::any().map(move || users.clone())
}

pub fn with_rooms(rooms: Rooms) -> impl Filter<Extract = (Rooms,), Error = Infallible> + Clone {
    warp::any().map(move || rooms.clone())
}