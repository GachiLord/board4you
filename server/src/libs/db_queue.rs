use log::info;
use protocol::board_protocol::BoardSize;
use std::time::Duration;
use tokio::{
    sync::{mpsc, oneshot},
    time::sleep,
};
use uuid::Uuid;

use crate::{
    entities::{
        board,
        edit::{self, EditAction, EditState, EditStatus, IdAction},
    },
    PoolWrapper, DB_QUEUE_ITEM_SIZE, DB_QUEUE_ITER_TIME_MS,
};

use super::state::DbClient;

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

pub fn new_db_queue(size: usize) -> (&'static DbQueueSender, DbQueueReceiver) {
    let (tx1, rx1) = mpsc::channel(size);
    let (tx2, rx2) = mpsc::channel(size);
    let (tx3, rx3) = mpsc::channel(size);
    let (tx4, rx4) = mpsc::channel(size);
    let (tx5, rx5) = mpsc::channel(size);

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

pub async fn queue_task(pool: &'static PoolWrapper, db_queue_receiver: DbQueueReceiver) {
    // get clients for tasks
    let queue_size = *DB_QUEUE_ITEM_SIZE;
    let iter_time = *DB_QUEUE_ITER_TIME_MS;
    // spawn edit create task
    tokio::spawn(async move {
        create_edit_task(
            &pool.get().await,
            db_queue_receiver.create_edit,
            queue_size,
            iter_time,
        )
        .await;
    });
    // spawn edit update task
    tokio::spawn(async move {
        update_edit_task(
            &pool.get().await,
            db_queue_receiver.update_edit,
            queue_size,
            iter_time,
        )
        .await;
    });
    // spawn edit read task
    tokio::spawn(async move {
        read_edit_task(
            &pool.get().await,
            db_queue_receiver.read_edit,
            queue_size,
            iter_time,
        )
        .await;
    });
    // spawn board create task
    tokio::spawn(async move {
        create_board_task(
            &pool.get().await,
            db_queue_receiver.create_board,
            queue_size,
            iter_time,
        )
        .await;
    });
    // spawn board update task
    tokio::spawn(async move {
        update_board_task(
            &pool.get().await,
            db_queue_receiver.update_board,
            queue_size,
            iter_time,
        )
        .await;
    });
}

async fn create_edit_task(
    db_client: &DbClient<'_>,
    mut receiver: mpsc::Receiver<EditCreateChunk>,
    limit: usize,
    iter_time: Duration,
) {
    loop {
        let mut chunks = Vec::with_capacity(limit);
        info!("create edit rx len - {}", receiver.len());
        receiver.recv_many(&mut chunks, limit).await;
        info!("chunks len - {}", chunks.len());
        let _ = edit::create(db_client, chunks).await;
        sleep(iter_time).await;
        info!("create edit iter");
    }
}
async fn update_edit_task(
    db_client: &DbClient<'_>,
    mut receiver: mpsc::Receiver<EditUpdateChunk>,
    limit: usize,
    iter_time: Duration,
) {
    loop {
        let mut chunks = Vec::with_capacity(limit);
        receiver.recv_many(&mut chunks, 100).await;
        info!("chunks len - {}", chunks.len());
        let _ = edit::set_status(db_client, chunks).await;
        sleep(iter_time).await;
        info!("update edit iter");
    }
}

async fn read_edit_task(
    db_client: &DbClient<'_>,
    mut receiver: mpsc::Receiver<EditReadChunk>,
    limit: usize,
    iter_time: Duration,
) {
    loop {
        let mut chunks = Vec::with_capacity(limit);
        receiver.recv_many(&mut chunks, limit).await;
        info!("chunks len - {}", chunks.len());
        let _ = edit::read(db_client, chunks).await;
        sleep(iter_time).await;
        info!("read edit iter");
    }
}

async fn create_board_task(
    db_client: &DbClient<'_>,
    mut receiver: mpsc::Receiver<BoardCreateChunk>,
    limit: usize,
    iter_time: Duration,
) {
    loop {
        let mut chunks = Vec::with_capacity(limit);
        receiver.recv_many(&mut chunks, limit).await;
        info!("chunks len - {}", chunks.len());
        let _ = board::create(db_client, chunks).await;
        sleep(iter_time).await;
        info!("create board iter");
    }
}
async fn update_board_task(
    db_client: &DbClient<'_>,
    mut receiver: mpsc::Receiver<BoardUpdateChunk>,
    limit: usize,
    iter_time: Duration,
) {
    loop {
        let mut chunks = Vec::with_capacity(limit);
        receiver.recv_many(&mut chunks, limit).await;
        info!("chunks len - {}", chunks.len());
        let _ = board::update(db_client, chunks).await;
        sleep(iter_time).await;
        info!("update board iter");
    }
}
