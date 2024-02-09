use crate::libs::{
    flood_protection::BannedUsers,
    state::{Rooms, WSUsers},
};
use log::info;
use tokio::time::{interval, Duration};

/// Creates an infinite loop which logs some useful data about the server's state.
/// The function waites for provided duration intil start of a new cycle
pub async fn monitor(
    duration: Duration,
    rooms: Rooms,
    ws_users: WSUsers,
    banned_users: BannedUsers,
) {
    let mut interval = interval(duration);
    loop {
        interval.tick().await;
        info!("Active rooms count: {}", rooms.read().await.len());
        info!("Amount of websocket users: {}", ws_users.read().await.len());
        info!(
            "Amount of banned users: {}",
            banned_users.read().await.len()
        );
        info!("===========");
    }
}
