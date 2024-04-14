use tokio::sync::mpsc::unbounded_channel;
use weak_table::WeakKeyHashMap;

use crate::{
    entities::board,
    libs::{
        room::{self, RoomChannel},
        state::{DbClient, Room, Rooms},
    },
};

pub async fn retrive_room_channel(
    db_client: DbClient,
    rooms: Rooms,
    public_id: Box<str>,
) -> Result<RoomChannel, Box<str>> {
    let rooms_p = rooms.read().await;

    match rooms_p.get(&public_id) {
        Some(r) => return Ok(r.to_owned()),
        None => {
            // drop previous rooms pointer to prevent deadlock
            drop(rooms_p);
            match board::get(db_client, &public_id).await {
                // if there is a room in db, spawn it
                Ok((private_id, board)) => {
                    let room = Room {
                        public_id: public_id.clone(),
                        private_id,
                        board,
                        users: WeakKeyHashMap::with_capacity(10),
                        owner_id: None, // we don't need to provide owner_id here, because
                                        // it had already been saved in db earler during
                                        // last cleanup.
                    };
                    // spawn room_task
                    let (tx, rx) = unbounded_channel();
                    let public_id_c = public_id.clone();
                    tokio::spawn(async move {
                        room::task(public_id_c, room, db_client, rx).await;
                    });
                    // add new room
                    let mut rooms_p = rooms.write().await;
                    rooms_p.insert(public_id, tx.to_owned());
                    return Ok(tx);
                }
                Err(_) => return Err(public_id),
            }
        }
    }
}
