use crate::{
    entities::board::save,
    libs::state::{DbClient, Rooms},
};

pub async fn on_shutdown(db_client: &DbClient, rooms: Rooms) {
    // save rooms
    let rooms = rooms.read().await;
    for (_, room) in rooms.iter() {
        let _ = save(db_client, &room).await;
    }
}
