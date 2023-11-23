use tokio::time::{self, Duration};
use tokio_postgres::Client;
use crate::{Rooms, board::create};
use std::{mem::take, sync::Arc};

pub async fn remove_unused_rooms(client: &Arc<Client>, rooms: &Rooms, duration: Duration) {
    let mut interval = time::interval(duration);
    loop {
        // wait for duration
        interval.tick().await;
        // remove unused rooms
        let rooms = rooms.clone();
        let mut rooms = rooms.write().await;
        let mut expired_rooms = vec![];
        // collect and expire unused rooms
        rooms.retain(|_, room| {
            room.users.remove_expired();
            if room.users.len() != 0{ 
                return true
            }
            expired_rooms.push(take(room));
            return false
        });
        // save expired rooms to db
        for room in &expired_rooms{
            create(&client, &room).await.unwrap();
        }
        // cleanup log
        println!("{} unused room(s) removed", expired_rooms.len());
    }
}
