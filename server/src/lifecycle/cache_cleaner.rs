use std::time::Duration;

use tokio::time;

use crate::{
    libs::{room::UserMessage, state::Rooms},
    CACHE_CLEANUP_INTERVAL_SECONDS,
};

pub async fn cleanup_cache(rooms: Rooms) {
    let mut interval = time::interval(Duration::from_secs(*CACHE_CLEANUP_INTERVAL_SECONDS));
    loop {
        // wait for duration
        interval.tick().await;
        // remove unused rooms
        let rooms_p = rooms.read().await;
        let rooms = rooms_p.clone();
        drop(rooms_p);
        for (_, chan) in rooms.iter() {
            let _ = chan.send(UserMessage::TryExpireCache).await;
        }
    }
}
