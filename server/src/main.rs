use std::convert::Infallible;
use std::env;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::path::Path;
use tokio::sync::mpsc;
use warp::Filter;
use futures_util::{SinkExt, StreamExt, TryFutureExt};
use tokio_stream::wrappers::UnboundedReceiverStream;
use warp::ws::WebSocket;
// modules
mod message;
mod state;
mod api;
// use
use crate::message::user_message;
use crate::state::{Rooms, WSUsers};
use crate::api::room_filter;

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
            ws.on_upgrade(move |socket| user_connected(socket, users, rooms))
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
    // run server 
    warp::serve(routes).run(([0, 0, 0, 0], 3000)).await;
}

async fn user_connected(ws: WebSocket, users: WSUsers, rooms: Rooms) {
    // Use a counter to assign a new unique ID for this user.
    let my_id = NEXT_USER_ID.fetch_add(1, Ordering::Relaxed);

    eprintln!("new board user: {}", my_id);

    // Split the socket into a sender and receiver of messages.
    let (mut user_ws_tx, mut user_ws_rx) = ws.split();

    // Use an unbounded channel to handle buffering and flushing of messages
    // to the websocket...
    let (tx, rx) = mpsc::unbounded_channel();
    let mut rx = UnboundedReceiverStream::new(rx);

    tokio::task::spawn(async move {
        while let Some(message) = rx.next().await {
            user_ws_tx
                .send(message)
                .unwrap_or_else(|e| {
                    eprintln!("websocket send error: {}", e);
                })
                .await;
        }
    });

    // Save the sender in our list of connected users.
    users.write().await.insert(my_id, tx);

    // Return a `Future` that is basically a state machine managing
    // this specific user's connection.

    // Every time the user sends a message, broadcast it to
    // all other users...
    while let Some(result) = user_ws_rx.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                eprintln!("websocket error(uid={}): {}", my_id, e);
                break;
            }
        };
        user_message(my_id, msg, &users, &rooms).await;
    }

    // user_ws_rx stream will keep processing as long as the user stays
    // connected. Once they disconnect, then...
    user_disconnected(my_id, &users).await;
    
}

async fn user_disconnected(my_id: usize, users: &WSUsers) {
    eprintln!("good bye user: {}", my_id);

    // Stream closed up, so remove from the user list
    users.write().await.remove(&my_id);
}


pub fn with_ws_users(users: WSUsers) -> impl Filter<Extract = (WSUsers,), Error = Infallible> + Clone {
    warp::any().map(move || users.clone())
}

pub fn with_rooms(rooms: Rooms) -> impl Filter<Extract = (Rooms,), Error = Infallible> + Clone {
    warp::any().map(move || rooms.clone())
}