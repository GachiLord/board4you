use tokio::sync::mpsc::channel;
use uuid::Uuid;

use crate::{
    entities::board,
    libs::{
        room::{self, RoomChannel},
        state::Room,
    },
    AppState,
};

pub async fn retrive_room_channel(state: AppState, public_id: Uuid) -> Result<RoomChannel, Uuid> {
    let rooms_p = state.rooms.read().await;

    match rooms_p.get(&public_id) {
        Some(r) => return Ok(r.to_owned()),
        None => {
            // drop previous rooms pointer to prevent deadlock
            drop(rooms_p);
            match board::get(state.pool, state.db_queue, public_id).await {
                // if there is a room in db, spawn it
                Ok((private_id, board)) => {
                    // we don't need to provide owner_id here, because
                    // it had already been saved in db earler during
                    // last cleanup.
                    let room = Room::load(board, private_id).await;
                    // spawn room_task
                    let (tx, rx) = channel(1);
                    let public_id_c = public_id.clone();
                    tokio::spawn(async move {
                        room::task(public_id_c, room, state.pool, state.db_queue, rx).await;
                    });
                    // add new room
                    let mut rooms_p = state.rooms.write().await;
                    rooms_p.insert(public_id, tx.to_owned());
                    return Ok(tx);
                }
                Err(_) => return Err(public_id),
            }
        }
    }
}
