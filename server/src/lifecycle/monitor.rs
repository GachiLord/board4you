use crate::{libs::state::Rooms, MONITOR_INTERVAL_MINUTES};
use log::info;
use tokio::time::{interval, Duration};

/// Creates an infinite loop which logs some useful data about the server's state.
/// The function waites for provided duration intil start of a new cycle
pub async fn monitor(rooms: Rooms) {
    let mut interval = interval(Duration::from_secs(*MONITOR_INTERVAL_MINUTES * 60));
    loop {
        interval.tick().await;
        info!("Active rooms count: {}", rooms.read().await.len());
        info!("===========");
    }
}
