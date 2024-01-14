use crate::libs::state::{Board, Room};
use serde::Serialize;
use std::error::Error;
use std::sync::Arc;
use tokio_postgres::Client;

pub enum SaveAction {
    Created,
    Updated,
}
pub async fn save(client: &Arc<Client>, room: &Room) -> Result<SaveAction, Box<dyn Error>> {
    let board_state = serde_json::to_value(&room.board).expect("failed to serealize room.board");
    match client
        .query(
            "SELECT * FROM boards WHERE public_id = $1",
            &[&room.public_id],
        )
        .await
    {
        Ok(res) => {
            if res.len() == 0 {
                client.execute(
                    "INSERT INTO boards(public_id, private_id, board_state, owner_id, title) VALUES ($1, $2, $3, $4, $5)",
                    &[&room.public_id, &room.private_id, &board_state, &room.owner_id, &room.board.title]
                ).await?;
            } else {
                client
                    .execute(
                        "UPDATE boards SET board_state = ($1), title = ($2) WHERE public_id = ($3)",
                        &[&board_state, &room.board.title, &room.public_id],
                    )
                    .await?;
                return Ok(SaveAction::Updated);
            }
        }
        Err(e) => return Err(Box::new(e)),
    }

    Ok(SaveAction::Created)
}

pub async fn get(
    client: &Client,
    public_id: &str,
) -> Result<(String, Board), tokio_postgres::Error> {
    let sql_res = client
        .query_one("SELECT * FROM boards WHERE public_id = $1", &[&public_id])
        .await?;

    let mut board: Board =
        serde_json::from_value(sql_res.get("board_state")).expect("failed to parse board_state");
    let private_id = sql_res.get("private_id");
    board.title = sql_res.get("title");

    Ok((private_id, board))
}

#[derive(Debug, Serialize)]
pub struct BoardInfo {
    pub id: i32,
    pub title: String,
    pub public_id: String,
}

pub async fn get_by_owner(
    client: &Client,
    owner_id: i32,
) -> Result<Vec<BoardInfo>, tokio_postgres::Error> {
    let result = client
        .query(
            "SELECT id, title, public_id FROM boards WHERE owner_id = ($1)",
            &[&owner_id],
        )
        .await?;

    Ok(result
        .iter()
        .map(|row| BoardInfo {
            title: row.get("title"),
            public_id: row.get("public_id"),
            id: row.get("id"),
        })
        .collect())
}

pub async fn delete(
    client: &Client,
    public_id: &str,
    private_id: &str,
) -> Result<u64, tokio_postgres::Error> {
    client
        .execute(
            "DELETE FROM boards WHERE public_id = ($1) AND private_id = ($2)",
            &[&public_id, &private_id],
        )
        .await
}
