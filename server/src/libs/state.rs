use crate::{
    entities::edit::{sync_with_queue, EditState, EditStatus},
    libs::db_queue::EditReadChunk,
    PoolWrapper, CACHE_CLEANUP_INTERVAL_SECONDS, OPERATION_QUEUE_SIZE,
};

use super::{
    db_queue::{DbQueueSender, EditDeleteChunk},
    room::{UserChannel, UserMessage},
};
use bb8::PooledConnection;
use bb8_postgres::PostgresConnectionManager;
use data_encoding::BASE64URL;
use jwt_simple::algorithms::HS256Key;
use protocol::board_protocol::{
    edit::Edit as EditInner, BoardSize, Edit, EditData, PullData, Shape,
};
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
    time::SystemTime,
};
use tokio::sync::{mpsc, oneshot, RwLock};
use tokio_postgres::NoTls;
use uuid::Uuid;

/// current - edits that are accepted
/// undone - edits that are not accepted
/// size - canvas size
/// title - board's title
/// co_editor_private_id - token for co-editors, may change if author asks
#[derive(Clone)]
pub struct Board {
    pool: &'static PoolWrapper,
    db_queue: &'static DbQueueSender,
    db_cache: Option<EditState>,
    db_cache_used_at: SystemTime,
    queue: Vec<QueueOp>,
    size: BoardSize,
    title: Box<str>,
    public_id: Uuid,
}

// queue

#[derive(Clone)]
pub enum QueueOp {
    Push(SystemTime, Edit),
    Undo(SystemTime, Box<str>),
    Redo(SystemTime, Box<str>),
}

// shape

const MAX_DIMENSION_SIZE: f32 = 10_000_f32;
const MAX_IMAGE_LENGTH: u16 = 60_000;

// commands

pub struct Command {
    pub name: CommandName,
    pub id: Box<str>,
}

#[derive(Debug)]
pub enum CommandName {
    Undo,
    Redo,
}

#[derive(Debug)]
pub enum PushError {
    WrongValue(&'static str),
    DbError,
}

impl ToString for PushError {
    fn to_string(&self) -> String {
        match self {
            Self::WrongValue(msg) => msg.to_string(),
            Self::DbError => String::from("db error"),
        }
    }
}

pub trait ExposeId {
    fn id(&self) -> &str;
}

impl ExposeId for EditInner {
    fn id(&self) -> &str {
        match self {
            EditInner::Add(data) => &data.id,
            EditInner::Remove(data) => &data.id,
            EditInner::Modify(data) => &data.id,
        }
    }
}

impl Board {
    pub fn new(
        pool: &'static PoolWrapper,
        db_queue: &'static DbQueueSender,
        title: Box<str>,
        size: BoardSize,
    ) -> Self {
        Board {
            pool,
            db_queue,
            db_cache: None,
            db_cache_used_at: SystemTime::now(),
            queue: Vec::with_capacity(*OPERATION_QUEUE_SIZE),
            public_id: Uuid::now_v7(),
            size,
            title,
        }
    }

    pub fn load(
        pool: &'static PoolWrapper,
        db_queue: &'static DbQueueSender,
        title: Box<str>,
        size: BoardSize,
        public_id: Uuid,
    ) -> Self {
        Board {
            pool,
            db_queue,
            db_cache: None,
            db_cache_used_at: SystemTime::now(),
            queue: Vec::with_capacity(*OPERATION_QUEUE_SIZE),
            public_id,
            size,
            title,
        }
    }

    pub fn clear_db_cache(&mut self) {
        let now = SystemTime::now();
        match now.duration_since(self.db_cache_used_at) {
            Ok(d) => {
                if d.as_secs() > *CACHE_CLEANUP_INTERVAL_SECONDS {
                    self.db_cache = None;
                }
            }
            Err(_) => {
                self.db_cache = None;
            }
        }
    }

    /// Returns a diff which lets user sync his state with server's
    ///
    /// # Panics
    ///
    /// Panics if there is an edit without id property
    pub async fn pull(
        &mut self,
        user_current: Vec<Box<str>>,
        user_undone: Vec<Box<str>>,
    ) -> PullData {
        // update timestamp to extend cache lifetime
        self.db_cache_used_at = SystemTime::now();
        // try using values from cache or fetch them from db
        let res = match &self.db_cache {
            Some(c) => c.clone(),
            None => {
                let (tx, rx) = oneshot::channel();
                self.db_queue
                    .read_edit
                    .send(EditReadChunk {
                        public_id: self.public_id,
                        ready: tx,
                    })
                    .await
                    .unwrap();
                let data = rx.await.unwrap();
                self.db_cache = Some(data.clone());
                data
            }
        };
        // apply queue's changes to db's values
        let (db_current, db_undone) = (res.current, res.undone);
        let mut full_current = Vec::from(db_current);
        let mut full_undone = Vec::from(db_undone);
        for op in self.queue.iter() {
            match op {
                QueueOp::Push(_, edit) => {
                    full_current.push(edit.clone());
                }
                QueueOp::Undo(_, id) => {
                    let index = full_current
                        .iter()
                        .rev()
                        .position(|edit| edit.edit.as_ref().unwrap().id() == id.as_ref());
                    if let Some(i) = index {
                        let edit = full_current.remove(full_current.len() - 1 - i);
                        full_undone.push(edit);
                    }
                }
                QueueOp::Redo(_, id) => {
                    let index = full_undone
                        .iter()
                        .rev()
                        .position(|edit| edit.edit.as_ref().unwrap().id() == id.as_ref());
                    if let Some(i) = index {
                        let edit = full_undone.remove(full_undone.len() - 1 - i);
                        full_current.push(edit);
                    }
                }
            }
        }
        // convert Maps' keys to HashSets
        let current: HashSet<&str> = HashSet::from_iter(
            full_current
                .iter()
                .map(|edit| edit.edit.as_ref().unwrap().id()),
        );
        let undone: HashSet<&str> = HashSet::from_iter(
            full_undone
                .iter()
                .map(|edit| edit.edit.as_ref().unwrap().id()),
        );
        // convert user's current and undone to HashSets
        let user_current: HashSet<&str> =
            HashSet::from_iter(user_current.iter().map(|e| e.as_ref()));
        let user_undone: HashSet<&str> = HashSet::from_iter(user_undone.iter().map(|e| e.as_ref()));
        // check current
        let current_create: HashSet<Box<str>> = current
            .iter()
            .filter_map(|e| match !user_current.contains(e) {
                true => return Some(e.to_string().into_boxed_str()),
                false => return None,
            })
            .collect();
        let current_delete: HashSet<Box<str>> = user_current
            .iter()
            .filter_map(|e| match !current.contains(e) {
                true => return Some(e.to_string().into_boxed_str()),
                false => return None,
            })
            .collect();
        // check undone
        let undone_create: HashSet<Box<str>> = undone
            .iter()
            .filter_map(|e| match !user_undone.contains(e) {
                true => return Some(e.to_string().into_boxed_str()),
                false => return None,
            })
            .collect();
        let undone_delete: HashSet<Box<str>> = user_undone
            .iter()
            .filter_map(|e| match !undone.contains(e) {
                true => return Some(e.to_string().into_boxed_str()),
                false => return None,
            })
            .collect();
        // return needed edits

        return PullData {
            current: Some(EditData {
                should_be_created_edits: full_current
                    .into_iter()
                    .filter(|edit| current_create.contains(edit.edit.as_ref().unwrap().id()))
                    .collect(),
                should_be_deleted_ids: Vec::from_iter(current_delete.into_iter().map(|v| v.into())),
            }),
            undone: Some(EditData {
                should_be_created_edits: full_undone
                    .into_iter()
                    .filter(|edit| undone_create.contains(edit.edit.as_ref().unwrap().id()))
                    .collect(),
                should_be_deleted_ids: Vec::from_iter(undone_delete.into_iter().map(|v| v.into())),
            }),
        };
    }

    /// Pushes a new edit to self.current or saves current buffer to db
    ///
    /// # Errors
    ///
    /// This function will return an error:
    /// - if the edit is None
    /// - if the edit has no id property
    /// - if the edit_type is not add or remove or modify
    pub async fn push(&mut self, edit: Edit) -> Result<(), PushError> {
        Self::validate_edit(&edit)?;
        // if the queue will be overflowed, clear it and save to db
        if self.queue.len() + 1 > *OPERATION_QUEUE_SIZE {
            self.db_cache = None;
            sync_with_queue(
                self.db_queue,
                self.public_id,
                self.queue.drain(..).collect(),
            )
            .await;
        }
        self.queue.push(QueueOp::Push(SystemTime::now(), edit));
        Ok(())
    }

    pub fn validate_edit(edit: &Edit) -> Result<(), PushError> {
        if edit.edit.is_none() {
            return Err(PushError::WrongValue("edit is None"));
        }
        // check id
        if Uuid::parse_str(edit.edit.as_ref().unwrap().id()).is_err()
            && edit.edit.as_ref().unwrap().id().len() != 36
        {
            return Err(PushError::WrongValue(
                "id must be valid uuid with hyphens(36 symbols)",
            ));
        }
        // check shapes
        match edit.edit.as_ref().unwrap() {
            EditInner::Add(ref e) => {
                if e.shape.is_none() {
                    return Err(PushError::WrongValue("shape is None"));
                }
                Board::validate_shape(&e.shape.as_ref().unwrap())?;
            }
            EditInner::Remove(ref e) => {
                for shape in e.shapes.iter() {
                    Board::validate_shape(&shape)?;
                }
            }
            EditInner::Modify(ref e) => {
                for shape in e.current.iter() {
                    Board::validate_shape(&shape)?;
                }
                for shape in e.initial.iter() {
                    Board::validate_shape(&shape)?;
                }
            }
        }

        Ok(())
    }

    fn validate_shape(shape: &Shape) -> Result<(), PushError> {
        if shape.line_size > MAX_DIMENSION_SIZE {
            return Err(PushError::WrongValue("line_size is too large"));
        }
        if shape.height > MAX_DIMENSION_SIZE || shape.width > MAX_DIMENSION_SIZE {
            return Err(PushError::WrongValue("height or width is too large"));
        }
        if shape.radius_x > MAX_DIMENSION_SIZE || shape.radius_y > MAX_DIMENSION_SIZE {
            return Err(PushError::WrongValue("radius_x or radius_y is too large"));
        }
        if shape.scale_x > MAX_DIMENSION_SIZE || shape.scale_y > MAX_DIMENSION_SIZE {
            return Err(PushError::WrongValue("scale_x or scale_y is too large"));
        }
        if shape.url.len().try_into().unwrap_or(u16::MAX) > MAX_IMAGE_LENGTH {
            return Err(PushError::WrongValue("image is too large"));
        }

        Ok(())
    }

    /// Executes Undo and Redo commands
    ///
    /// # Errors
    ///
    /// This function will return an error if command.id does not exit in self.current or self.undone
    pub async fn exec_command(&mut self, command: Command) -> Result<(), &'static str> {
        match command.name {
            CommandName::Undo => {
                // if undone will be overflowed, clear it and save to db
                if self.queue.len() + 1 > *OPERATION_QUEUE_SIZE {
                    self.db_cache = None;
                    sync_with_queue(
                        self.db_queue,
                        self.public_id,
                        self.queue.drain(..).collect(),
                    )
                    .await;
                }
                self.queue
                    .push(QueueOp::Undo(SystemTime::now(), command.id));
            }
            CommandName::Redo => {
                // if current will be overflowed, clear it and save to db
                if self.queue.len() + 1 > *OPERATION_QUEUE_SIZE {
                    self.db_cache = None;
                    sync_with_queue(
                        self.db_queue,
                        self.public_id,
                        self.queue.drain(..).collect(),
                    )
                    .await;
                }
                self.queue
                    .push(QueueOp::Redo(SystemTime::now(), command.id));
            }
        };

        Ok(())
    }

    /// clears self.current
    pub async fn empty_current(&mut self) {
        self.db_cache = None;
        sync_with_queue(
            self.db_queue,
            self.public_id,
            self.queue.drain(..).collect(),
        )
        .await;
        let (tx, rx) = oneshot::channel();
        self.db_queue
            .delete_edit
            .send(EditDeleteChunk {
                public_id: self.public_id,
                status: EditStatus::Current,
                ready: tx,
            })
            .await
            .unwrap();
        rx.await.unwrap();
    }

    /// clears self.undone
    pub async fn empty_undone(&mut self) {
        self.db_cache = None;
        sync_with_queue(
            self.db_queue,
            self.public_id,
            self.queue.drain(..).collect(),
        )
        .await;
        let (tx, rx) = oneshot::channel();
        self.db_queue
            .delete_edit
            .send(EditDeleteChunk {
                public_id: self.public_id,
                status: EditStatus::Undone,
                ready: tx,
            })
            .await
            .unwrap();
        rx.await.unwrap();
    }

    pub fn set_title(&mut self, title: Box<str>) -> Result<(), PushError> {
        Self::validate_title(&title)?;
        self.title = title;
        Ok(())
    }

    pub fn validate_title(title: &str) -> Result<(), PushError> {
        if title.len() > 36 {
            return Err(PushError::WrongValue("size is too big"));
        }
        Ok(())
    }

    pub fn validate_size(height: u32, width: u32) -> Result<(), PushError> {
        if height > MAX_DIMENSION_SIZE as u32 || width > MAX_DIMENSION_SIZE as u32 {
            return Err(PushError::WrongValue("size is too big"));
        }

        Ok(())
    }

    pub fn set_size(&mut self, height: u32, width: u32) -> Result<(), PushError> {
        Self::validate_size(height, width)?;
        self.size.height = height;
        self.size.width = width;
        Ok(())
    }

    pub fn op_queue(self) -> Vec<QueueOp> {
        self.queue
    }
}

/// public_id - id for connection to the room
/// private_id - author's token for editing, invites, deletion etc.
/// users - room's connected users
/// board - state of the room
/// onwer_id - id of the creator, is_some if the author was authed
pub struct Room {
    private_id: Box<str>,
    co_editor_private_id: Box<str>,
    users: HashMap<usize, UserChannel>,
    pub board: Board,
    owner_id: Option<i32>,
}

impl Room {
    pub async fn new(board: Board, owner_id: Option<i32>) -> Self {
        Room {
            private_id: Room::generate_private_id().await,
            co_editor_private_id: Room::generate_editor_private_id().await,
            users: HashMap::with_capacity(20),
            board,
            owner_id,
        }
    }

    pub async fn load(board: Board, private_id: Box<str>, owner_id: Option<i32>) -> Self {
        Room {
            private_id,
            co_editor_private_id: Room::generate_editor_private_id().await,
            users: HashMap::with_capacity(20),
            board,
            owner_id,
        }
    }

    // getters

    pub fn users(&self) -> &HashMap<usize, UserChannel> {
        &self.users
    }

    pub fn public_id(&self) -> Uuid {
        self.board.public_id
    }

    pub fn private_id(&self) -> &str {
        &self.private_id
    }

    pub fn co_editor_private_id(&self) -> &str {
        &self.co_editor_private_id
    }

    pub fn title(&self) -> &str {
        &self.board.title
    }

    pub fn size(&self) -> &BoardSize {
        &self.board.size
    }

    // setters

    pub fn add_user(&mut self, id: usize, chan: UserChannel) {
        self.users.insert(id, chan);
    }
    pub fn remove_user(&mut self, id: &usize) {
        self.users.remove(id);
    }

    async fn generate_private_id() -> Box<str> {
        let (tx, rx) = oneshot::channel();
        tokio::task::spawn_blocking(move || {
            tx.send(
                BASE64URL
                    .encode(&HS256Key::generate().to_bytes())
                    .into_boxed_str(),
            )
            .unwrap()
        });
        rx.await.unwrap()
    }

    async fn generate_editor_private_id() -> Box<str> {
        let (tx, rx) = oneshot::channel();
        tokio::task::spawn_blocking(move || {
            tx.send(
                (BASE64URL.encode(&HS256Key::generate().to_bytes()) + "_co_editor")
                    .into_boxed_str(),
            )
            .unwrap()
        });
        rx.await.unwrap()
    }

    /// Updates self.co_editor_private_id and returns new one
    pub async fn update_editor_private_id(&mut self) -> Box<str> {
        self.co_editor_private_id = Room::generate_editor_private_id().await;

        self.co_editor_private_id.to_owned()
    }
}

pub type Rooms = Arc<RwLock<HashMap<Uuid, mpsc::Sender<UserMessage>>>>;
pub type DbClient<'a> = PooledConnection<'static, PostgresConnectionManager<NoTls>>;
