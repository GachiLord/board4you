use futures::future::{join, join3};
use log::{debug, error};
use protocol::board_protocol::BoardSize;
use std::time::Duration;
use tokio::{
    select,
    sync::{mpsc, oneshot},
    time::{sleep, timeout},
};
use uuid::Uuid;

use crate::{
    entities::{
        board,
        edit::{self, EditAction, EditState, EditStatus, IdAction},
    },
    PoolWrapper, DB_QUEUE_ITEM_SIZE, DB_QUEUE_ITER_TIME_MS,
};

// edit

pub struct EditCreateChunk {
    pub public_id: Uuid,
    pub status: EditStatus,
    pub items: Vec<EditAction>,
    pub ready: oneshot::Sender<()>,
}

pub struct EditUpdateChunk {
    pub status: EditStatus,
    pub items: Vec<IdAction>,
    pub ready: oneshot::Sender<()>,
}

pub struct EditReadChunk {
    pub public_id: Uuid,
    pub ready: oneshot::Sender<EditState>,
}

// board

pub struct BoardCreateChunk {
    pub public_id: Uuid,
    pub private_id: Box<str>,
    pub owner_id: Option<i32>,
    pub title: Box<str>,
    pub ready: oneshot::Sender<()>,
}

pub struct BoardUpdateChunk {
    pub public_id: Uuid,
    pub title: Box<str>,
    pub size: BoardSize,
    pub ready: oneshot::Sender<()>,
}

#[derive(Debug, Clone)]
pub struct DbQueueSender {
    pub create_edit: mpsc::Sender<EditCreateChunk>,
    pub update_edit: mpsc::Sender<EditUpdateChunk>,
    pub read_edit: mpsc::Sender<EditReadChunk>,
    pub create_board: mpsc::Sender<BoardCreateChunk>,
    pub update_board: mpsc::Sender<BoardUpdateChunk>,
}

#[derive(Debug)]
pub struct DbQueueReceiver {
    pub create_edit: mpsc::Receiver<EditCreateChunk>,
    pub update_edit: mpsc::Receiver<EditUpdateChunk>,
    pub read_edit: mpsc::Receiver<EditReadChunk>,
    pub create_board: mpsc::Receiver<BoardCreateChunk>,
    pub update_board: mpsc::Receiver<BoardUpdateChunk>,
}

pub fn new_db_queue() -> (&'static DbQueueSender, DbQueueReceiver) {
    let (tx1, rx1) = mpsc::channel(*DB_QUEUE_ITEM_SIZE);
    let (tx2, rx2) = mpsc::channel(*DB_QUEUE_ITEM_SIZE);
    let (tx3, rx3) = mpsc::channel(*DB_QUEUE_ITEM_SIZE);
    let (tx4, rx4) = mpsc::channel(*DB_QUEUE_ITEM_SIZE);
    let (tx5, rx5) = mpsc::channel(*DB_QUEUE_ITEM_SIZE);

    let tx = Box::leak(Box::new(DbQueueSender {
        create_edit: tx1,
        update_edit: tx2,
        read_edit: tx3,
        create_board: tx4,
        update_board: tx5,
    }));
    let rx = DbQueueReceiver {
        create_edit: rx1,
        update_edit: rx2,
        read_edit: rx3,
        create_board: rx4,
        update_board: rx5,
    };

    return (tx, rx);
}

// tasks

macro_rules! spawn_task {
    ($pool:expr, $receiver:expr, $task_fn:expr, $task_name:expr) => {
        tokio::spawn(async move {
            let mut db_client = $pool.inner.dedicated_connection().await.unwrap();
            let mut chunks = Vec::with_capacity(*DB_QUEUE_ITEM_SIZE);
            loop {
                $receiver.recv_many(&mut chunks, *DB_QUEUE_ITEM_SIZE).await;
                debug!("received {} chunks by {}", chunks.len(), $task_name);
                match timeout(
                    Duration::from_secs(30),
                    $task_fn(&db_client, chunks.drain(..).collect()),
                )
                .await
                {
                    Ok(_) => (),
                    Err(e) => {
                        error!("Cannot perform {}: {}", $task_name, e);
                        db_client = $pool.inner.dedicated_connection().await.unwrap();
                    }
                }
                sleep(*DB_QUEUE_ITER_TIME_MS).await;
            }
        });
    };
}

fn spawn_edit_task(
    pool: &'static PoolWrapper,
    mut create_edit: mpsc::Receiver<EditCreateChunk>,
    mut update_edit: mpsc::Receiver<EditUpdateChunk>,
    mut read_edit: mpsc::Receiver<EditReadChunk>,
) {
    // spawn edit file writer task
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        edit::edit_writer(rx);
    });
    // spawn edit db write/read task
    tokio::spawn(async move {
        let db_client = pool.inner.dedicated_connection().await.unwrap();
        let mut chunks_c = Vec::with_capacity(*DB_QUEUE_ITEM_SIZE);
        let mut chunks_u = Vec::with_capacity(*DB_QUEUE_ITEM_SIZE);
        let mut chunks_r = Vec::with_capacity(*DB_QUEUE_ITEM_SIZE);
        loop {
            select! {
                _ = create_edit.recv_many(&mut chunks_c, *DB_QUEUE_ITEM_SIZE) => {
                    debug!("create");
                    let _ = edit::create(&db_client, &tx, chunks_c.drain(..).collect()).await;
                },
                _ = update_edit.recv_many(&mut chunks_u, *DB_QUEUE_ITEM_SIZE) => {
                    debug!("update");
                    let _ = edit::set_status(&db_client, chunks_u.drain(..).collect()).await;

                },
                _ = read_edit.recv_many(&mut chunks_r, *DB_QUEUE_ITEM_SIZE) => {
                    debug!("read");
                    let _ = edit::read(&db_client, chunks_r.drain(..).collect()).await;
                }
            }
            sleep(*DB_QUEUE_ITER_TIME_MS).await;
        }
    });
}

pub async fn queue_task(pool: &'static PoolWrapper, mut db_queue_receiver: DbQueueReceiver) {
    spawn_task!(
        pool,
        db_queue_receiver.create_board,
        board::create,
        "create_board"
    );
    spawn_task!(
        pool,
        db_queue_receiver.update_board,
        board::update,
        "update_board"
    );
    spawn_edit_task(
        pool,
        db_queue_receiver.create_edit,
        db_queue_receiver.update_edit,
        db_queue_receiver.read_edit,
    );
}
