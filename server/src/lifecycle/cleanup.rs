use crate::libs::state::Rooms;
use crate::{entities::board::save, libs::flood_protection::BannedUsers};
use log::info;
use std::{mem::take, sync::Arc};
use tokio::time::{self, Duration};
use tokio_postgres::Client;

/// Creates an infinite loop which scans for rooms without users and saves them to db.
/// The function waites for provided duration intil start of a new cycle
pub async fn cleanup(
    client: &Arc<Client>,
    rooms: Rooms,
    banned_users: BannedUsers,
    duration: Duration,
) {
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
        info!("{} unused room(s) have been deleted", expired_rooms.len());
        // remove unused banned users
        let mut banned_users = banned_users.write().await;
        let initial_len = banned_users.len();
        banned_users.retain(|_, user| !user.ban_is_over());
        info!(
            "{} unused banned user(s) have been deleted",
            initial_len - banned_users.len()
        );
    }
}
