use tokio::time::{self, Duration};
use crate::Rooms;

pub async fn remove_unused_rooms(rooms: &Rooms, duration: Duration) {
    let mut interval = time::interval(duration);
    loop {
        // wait for duration
        interval.tick().await;
        // remove unused rooms
        let rooms = rooms.clone();
        let mut rooms = rooms.write().await;
        rooms.retain(|_, room| {
            room.users.remove_expired();
            return room.users.len() != 0;
        });
    }
}