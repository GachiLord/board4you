use std::sync::Arc;

use crate::state::{Room, Board};
use tokio_postgres::Client;

pub async fn create(client: &Arc<Client>, room: &Room) -> Result<u64, tokio_postgres::Error>{
    let board_state = serde_json::to_value(&room.board).expect("failed to serealize room.board");
    client.execute(
        "INSERT INTO boards(public_id, private_id, board_state) VALUES ($1, $2, $3)",
        &[&room.public_id, &room.private_id, &board_state]
    ).await   
}

pub async fn get(client: &Client, public_id: &str) -> Result<(String, Board), tokio_postgres::Error> {
    let sql_res = client.query_one(
        "SELECT * FROM boards WHERE public_id = $1",
        &[&public_id]
    ).await?;

    let board: Board = serde_json::from_str(sql_res.get("board_state")).expect("failed to parse board_state");
    let private_id = sql_res.get("private_id");

    Ok((private_id, board))
}
