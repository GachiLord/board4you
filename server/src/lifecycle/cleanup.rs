use std::collections::HashSet;

use crate::libs::state::Rooms;
use crate::{libs::room::UserMessage, CLEANUP_INTERVAL_MINUTES};
use log::{error, info};
use tokio::{
    sync::oneshot,
    time::{self, Duration},
};

/// Creates an infinite loop which scans for rooms without users and saves them to db.
/// The function waits for provided duration intil start of a new cycle
pub async fn cleanup(rooms: Rooms) {
    let mut interval = time::interval(Duration::from_secs(*CLEANUP_INTERVAL_MINUTES * 60));
    loop {
        // wait for duration
        interval.tick().await;
        // remove unused rooms
        let mut rooms_p = rooms.write().await;
        let mut expired_rooms = HashSet::new();
        // collect and expire unused rooms
        for (id, room) in rooms_p.iter() {
            let (tx, rx) = oneshot::channel();
            let _ = room.send(UserMessage::HasUsers(tx));
            match rx.await {
                Ok(res) => {
                    if !res {
                        expired_rooms.insert(id.to_owned());
                    }
                }
                Err(e) => {
                    error!("cannot receive response to HasUsers msg: {}", e);
                }
            }
        }
        rooms_p.retain(|id, _| !expired_rooms.contains(id));
        // cleanup log
        info!("{} unused room(s) have been deleted", expired_rooms.len());
        info!("===========");
        // shrink capacity
        rooms_p.shrink_to(20);
    }
}
