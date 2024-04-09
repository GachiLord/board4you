use futures_util::{SinkExt, StreamExt, TryFutureExt};
use log::{debug, warn};
use std::sync::Arc;
use tokio::sync::mpsc;
use tokio_postgres::Client;
use tokio_stream::wrappers::UnboundedReceiverStream;
use warp::ws::WebSocket;
// use
use crate::libs::state::{Rooms, WSUsers};
use crate::websocket::message::user_message;

pub async fn user_connected(
    user_id: usize,
    db_client: Arc<Client>,
    ws: WebSocket,
    users: WSUsers,
    rooms: Rooms,
) {
    // log new user
    debug!("new board user: {}", user_id);
    // create user_id Arc pointer
    let user_id_arc = Arc::new(user_id);

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
                    warn!("websocket send error: {}", e);
                })
                .await;
        }
    });

    // Save the sender in our list of connected users.
    users.write().await.insert(user_id_arc.clone(), tx);

    // Return a `Future` that is basically a state machine managing
    // this specific user's connection.

    // Every time the user sends a message, process it with user_message fn
    while let Some(result) = user_ws_rx.next().await {
        // check if msg is ok
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                warn!("websocket error(uid={}): {}", user_id, e);
                break;
            }
        };
        // proccess message
        let users = users.clone();
        let rooms = rooms.clone();
        let user_id_arc = user_id_arc.clone();
        let db_client = db_client.clone();
        user_message(user_id_arc, msg, &db_client, &users, &rooms).await;
    }

    // user_ws_rx stream will keep processing as long as the user stays
    // connected. Once they disconnect, then...
    user_disconnected(user_id_arc.clone(), &users).await;
}

async fn user_disconnected(id: Arc<usize>, users: &WSUsers) {
    debug!("good bye user: {}", id);
    // Stream closed up, so remove from the user list
    users.write().await.remove(&id);
    // drop user_id_arc to remove user from room automatically
    drop(id);
}
