use super::{get_page_query_params, Paginated};
use crate::{
    libs::{
        db_queue::{BoardCreateChunk, BoardUpdateChunk, DbQueueSender},
        state::{Board, DbClient},
    },
    PoolWrapper, OPERATION_QUEUE_SIZE,
};
use data_encoding::BASE64URL;
use futures::pin_mut;
use jwt_simple::algorithms::HS256Key;
use log::{error, warn};
use postgres_types::Type;
use protocol::board_protocol::BoardSize;
use serde::{Deserialize, Serialize};
use std::fmt::Write as _;
use tokio_postgres::binary_copy::BinaryCopyInWriter;
use uuid::Uuid;

pub async fn create(
    db_client: &DbClient<'_>,
    chunks: Vec<BoardCreateChunk>,
) -> Result<u64, tokio_postgres::Error> {
    // populate
    let sink = db_client
        .copy_in("COPY boards (owner_id, public_id, private_id, title) FROM STDIN BINARY")
        .await?;
    let writer = BinaryCopyInWriter::new(
        sink,
        &[Type::INT4, Type::UUID, Type::VARCHAR, Type::VARCHAR],
    );
    pin_mut!(writer);
    let mut ready_list = Vec::new();

    for chunk in chunks {
        match chunk.owner_id {
            Some(id) => {
                writer
                    .as_mut()
                    .write(&[&id, &chunk.public_id, &chunk.private_id, &chunk.title])
                    .await
                    .unwrap();
            }
            None => {
                writer
                    .as_mut()
                    .write(&[
                        &None::<&i32>,
                        &chunk.public_id,
                        &chunk.private_id,
                        &chunk.title,
                    ])
                    .await
                    .unwrap();
            }
        }
        ready_list.push(chunk.ready);
    }

    match writer.finish().await {
        Ok(r) => {
            ready_list.into_iter().for_each(|c| {
                if let Err(_) = c.send(()) {
                    warn!("Cannot send create result to the room");
                }
            });
            Ok(r)
        }
        Err(e) => {
            error!("Failed to finish COPY: {}", e);
            Ok(0)
        }
    }
}

pub async fn update(
    db_client: &DbClient<'_>,
    chunks: Vec<BoardUpdateChunk>,
) -> Result<(), tokio_postgres::Error> {
    let mut statement = String::from("BEGIN;");
    let mut ready_list = Vec::with_capacity(chunks.len());
    // form query
    for chunk in chunks {
        write!(
            &mut statement,
            "UPDATE boards SET title = '{}', height = {}, width = {} WHERE public_id = '{}';",
            chunk.title,
            chunk.size.height,
            chunk.size.width,
            chunk.public_id.to_string()
        )
        .unwrap();
        ready_list.push(chunk.ready);
    }
    statement.push_str("COMMIT;");
    // execute
    db_client.batch_execute(&statement).await?;
    // notify listeners
    ready_list.into_iter().for_each(|c| {
        if let Err(_) = c.send(()) {
            warn!("Failed to send update result");
        }
    });

    Ok(())
}

pub async fn get(
    pool: &'static PoolWrapper,
    db_queue: &'static DbQueueSender,
    public_id: Uuid,
) -> Result<(Box<str>, Board), tokio_postgres::Error> {
    let db_client = pool.get().await;
    let sql_res = db_client
        .query_one("SELECT * FROM boards WHERE public_id = $1", &[&public_id])
        .await?;

    // TODO: handle old db schema values
    let board = Board {
        pool,
        db_queue,
        queue: Vec::with_capacity(*OPERATION_QUEUE_SIZE),
        public_id,
        size: BoardSize {
            height: sql_res.get::<&str, i16>("height").try_into().unwrap_or(900),
            width: sql_res.get::<&str, i16>("width").try_into().unwrap_or(1720),
        },
        title: sql_res.get("title"),
        co_editor_private_id: (BASE64URL.encode(&HS256Key::generate().to_bytes()) + "_co_editor")
            .into_boxed_str(),
    };
    let private_id = sql_res.get("private_id");

    Ok((private_id, board))
}

#[derive(Debug, Serialize)]
pub struct BoardInfo {
    pub id: i32,
    pub title: Box<str>,
    pub public_id: Box<str>,
}

pub async fn get_by_owner(
    client: &DbClient<'_>,
    page: i64,
    owner_id: i32,
) -> Result<Paginated<Vec<BoardInfo>>, tokio_postgres::Error> {
    let count = client
        .query_one(
            "SELECT COUNT(*) FROM boards WHERE owner_id = ($1)",
            &[&owner_id],
        )
        .await?;
    let query_params = get_page_query_params(count.get("count"), page);

    let result = client
        .query(
            "SELECT id, title, public_id FROM boards WHERE owner_id = ($1) ORDER BY id DESC LIMIT ($2) OFFSET ($3)",
            &[&owner_id, &query_params.limit, &query_params.offset],
        )
        .await?;

    Ok(Paginated {
        content: result
            .iter()
            .map(|row| BoardInfo {
                title: row.get("title"),
                public_id: row.get("public_id"),
                id: row.get("id"),
            })
            .collect(),
        current_page: page,
        max_page: query_params.max_page,
    })
}

pub async fn delete(
    client: &DbClient<'_>,
    public_id: Uuid,
    private_id: &str,
) -> Result<u64, tokio_postgres::Error> {
    client
        .execute(
            "DELETE FROM boards WHERE public_id = ($1) AND private_id = ($2)",
            &[&public_id, &private_id],
        )
        .await
}

#[derive(Deserialize, Serialize)]
pub struct RoomCredentials {
    pub public_id: Box<str>,
    pub private_id: Box<str>,
}

pub async fn get_private_ids(
    client: &DbClient<'_>,
    owner_id: i32,
) -> Result<Vec<RoomCredentials>, tokio_postgres::Error> {
    let res = client
        .query(
            "SELECT private_id, public_id FROM boards WHERE owner_id=($1)",
            &[&owner_id],
        )
        .await?
        .iter()
        .map(|row| {
            return RoomCredentials {
                public_id: row.get("public_id"),
                private_id: row.get("private_id"),
            };
        })
        .collect::<Vec<RoomCredentials>>();
    Ok(res)
}
