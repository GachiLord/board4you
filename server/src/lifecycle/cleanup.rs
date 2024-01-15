use crate::entities::board::save;
use crate::libs::state::Rooms;
use log::info;
use std::{mem::take, sync::Arc};
use tokio::time::{self, Duration};
use tokio_postgres::Client;

/// Creates an infinite loop which scans for rooms without users and saves them to db.
/// The function waites for provided duration intil start of a new cycle
pub async fn remove_unused_rooms(client: &Arc<Client>, rooms: Rooms, duration: Duration) {
    let mut interval = time::interval(duration);
    loop {
        // wait for duration
        interval.tick().await;
        // remove unused rooms
        let mut rooms = rooms.write().await;
        let mut expired_rooms = vec![];
        // collect and expire unused rooms
        rooms.retain(|_, room| {
            room.users.remove_expired();
            if room.users.len() != 0 {
                return true;
            }
            expired_rooms.push(take(room));
            return false;
        });
        // save expired rooms to db
        for room in &expired_rooms {
            let _ = save(&client, &room).await;
        }
        // cleanup log
        info!("{} unused room(s) removed", expired_rooms.len());
    }
}
