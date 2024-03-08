use tokio::sync::oneshot;

use crate::libs::{room::UserMessage, state::Rooms};

pub async fn on_shutdown(rooms: Rooms) {
    // save rooms
    let rooms = rooms.read().await;
    for (_, room) in rooms.iter() {
        let (tx, rx) = oneshot::channel();
        let _ = room.send(UserMessage::Expire(tx));
        let _ = rx.await;
    }
}
