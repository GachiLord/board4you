use tokio::sync::oneshot;

use crate::libs::{room::UserMessage, state::Rooms};

pub async fn on_shutdown(rooms: Rooms) {
    let rooms = rooms.read().await;
    let mut receivers = Vec::with_capacity(rooms.len());
    // send Expire message
    for (_, room) in rooms.iter() {
        let (tx, rx) = oneshot::channel();
        let _ = room.send(UserMessage::Expire(tx));
        receivers.push(rx);
    }
    // await for saving
    for rx in receivers {
        let _ = rx.await;
    }
}
