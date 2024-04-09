use crate::libs::room::UserMessage;
use crate::libs::state::Rooms;
use log::info;
use tokio::{
    sync::oneshot,
    time::{self, Duration},
};

/// Creates an infinite loop which scans for rooms without users and saves them to db.
/// The function waites for provided duration intil start of a new cycle
pub async fn cleanup(rooms: Rooms, duration: Duration, no_persist: bool) {
    let mut interval = time::interval(duration);
    loop {
        // wait for duration
        interval.tick().await;
        // remove unused rooms
        let mut rooms_p = rooms.write().await;
        let mut expired_rooms = vec![];
        // collect and expire unused rooms
        for (id, room) in rooms_p.iter() {
            let (tx, rx) = oneshot::channel();
            let _ = room.send(UserMessage::HasUsers(tx, no_persist));
            if let Ok(res) = rx.await {
                if !res {
                    expired_rooms.push(id.to_owned());
                }
            }
        }
        // TODO: change to filter because Vec should shift all elements after removal of one
        for id in expired_rooms.iter() {
            rooms_p.remove(id);
        }
        // cleanup log
        info!("{} unused room(s) have been deleted", expired_rooms.len());
        info!("===========");
        // shrink capacity
        rooms_p.shrink_to(20);
    }
}
