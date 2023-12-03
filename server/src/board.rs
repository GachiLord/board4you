use std::sync::Arc;
use std::error::Error;
use crate::state::{Room, Board};
use tokio_postgres::Client;


pub enum SaveAction{
    Created,
    Updated
}
pub async fn save(client: &Arc<Client>, room: &Room) -> Result<SaveAction,  Box<dyn Error>>{
    let board_state = serde_json::to_value(&room.board).expect("failed to serealize room.board");
    match client.query("SELECT * FROM boards WHERE public_id = $1", &[&room.public_id]).await {
        Ok(res) => {
            if res.len() == 0{
                client.execute(
                    "INSERT INTO boards(public_id, private_id, board_state, owner_id) VALUES ($1, $2, $3, $4)",
                    &[&room.public_id, &room.private_id, &board_state, &room.owner_id]
                ).await?;
            }
            else {
                client.execute(
                    "UPDATE boards SET board_state = $1 WHERE public_id = $2",
                    &[&board_state, &room.public_id]
                ).await?;
                return Ok(SaveAction::Updated)
            }
        }
        Err(e) => return Err(Box::new(e))
    }

    Ok(SaveAction::Created)
    
}

pub async fn get(client: &Client, public_id: &str) -> Result<(String, Board), tokio_postgres::Error> {
    let sql_res = client.query_one(
        "SELECT * FROM boards WHERE public_id = $1",
        &[&public_id]
    ).await?;

    let board: Board = serde_json::from_value(sql_res.get("board_state")).expect("failed to parse board_state");
    let private_id = sql_res.get("private_id");

    Ok((private_id, board))
}
