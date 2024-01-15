use crate::libs::state::{Rooms, WSUsers};
use log::info;
use tokio::time::{interval, Duration};

/// Creates an infinite loop which logs some useful data about the server's state.
/// The function waites for provided duration intil start of a new cycle
pub async fn monitor(duration: Duration, rooms: Rooms, ws_users: WSUsers) {
    let mut interval = interval(duration);
    loop {
        interval.tick().await;
        info!(
            "Active rooms count: {}, Amount of websocket users: {}",
            rooms.read().await.len(),
            ws_users.read().await.len()
        )
    }
}
