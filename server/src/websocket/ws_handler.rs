use crate::AppState;

use super::handle_client;
use axum::{
    extract::{Path, State},
    response::IntoResponse,
};
use fastwebsockets::upgrade;

pub async fn ws_handler(
    State(state): State<AppState>,
    Path(public_id): Path<Box<str>>,
    ws: upgrade::IncomingUpgrade,
) -> impl IntoResponse {
    let (response, fut) = ws.upgrade().unwrap();

    tokio::task::spawn(async move {
        if let Err(e) = handle_client(public_id, state, fut).await {
            eprintln!("Error in websocket connection: {}", e);
        }
    });

    response
}
