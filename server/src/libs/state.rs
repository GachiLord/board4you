use crate::{
    entities::edit::{delete, read, sync_with_queue, EditStatus},
    PoolWrapper, OPERATION_QUEUE_SIZE,
};

use super::room::{UserChannel, UserMessage};
use bb8::PooledConnection;
use bb8_postgres::PostgresConnectionManager;
use data_encoding::BASE64URL;
use futures_util::future::join;
use jwt_simple::algorithms::HS256Key;
use log::debug;
use protocol::board_protocol::{
    edit::Edit as EditInner, BoardSize, Edit, EditData, PullData, Shape,
};
use std::{
    collections::{HashMap, HashSet},
    sync::{Arc, Weak},
    time::SystemTime,
};
use tokio::sync::{mpsc, RwLock};
use tokio_postgres::NoTls;
use uuid::Uuid;
use weak_table::WeakKeyHashMap;

/// current - edits that are accepted
/// undone - edits that are not accepted
/// size - canvas size
/// title - board's title
/// co_editor_private_id - token for co-editors, may change if author asks
#[derive(Clone)]
pub struct Board {
    pub pool: &'static PoolWrapper,
    pub id: i32,
    pub queue: Vec<QueueOp>,
    pub size: BoardSize,
    pub title: Box<str>,
    pub co_editor_private_id: Box<str>,
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
    /// Returns a diff which lets user sync his state with server's
    ///
    /// # Panics
    ///
    /// Panics if there is an edit without id property
    pub async fn pull(
        &self,
        user_current: Vec<Box<str>>,
        user_undone: Vec<Box<str>>,
    ) -> Result<PullData, tokio_postgres::Error> {
        // fetch edits from db
        let db_client = self.pool.get().await;
        let (db_current, db_undone) = join(
            read(&db_client, self.id, &EditStatus::Current),
            read(&db_client, self.id, &EditStatus::Undone),
        )
        .await;
        // apply queue's changes to db's values
        let db_current = db_current?;
        let db_undone = db_undone?;
        debug!("queue - {}", self.queue.len(),);
        debug!(
            "db_current - {}, db_undone - {}",
            db_current.len(),
            db_undone.len()
        );
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
        debug!(
            "full_current - {}, full_undone - {}",
            full_current.len(),
            full_undone.len()
        );
        debug!("<====> full_current start <====>");
        full_current
            .iter()
            .for_each(|e| debug!("{}", e.edit.as_ref().unwrap().id()));
        debug!("<====> full_current end <====>");
        debug!("<====> full_undone start <====>");
        full_undone
            .iter()
            .for_each(|e| debug!("{}", e.edit.as_ref().unwrap().id()));
        debug!("<====> full_undone  end <====>");
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

        return Ok(PullData {
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
        });
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
        // if the queue will be overflowed, clear it and save to db
        if self.queue.len() + 1 > *OPERATION_QUEUE_SIZE {
            let mut buf = Vec::with_capacity(*OPERATION_QUEUE_SIZE);
            buf.append(&mut self.queue);
            sync_with_queue(&self.pool.get().await, self.id, buf)
                .await
                .map_err(|_| PushError::DbError)?;
        }
        self.queue.push(QueueOp::Push(SystemTime::now(), edit));
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
                    let mut buf = Vec::with_capacity(*OPERATION_QUEUE_SIZE);
                    buf.append(&mut self.queue);

                    sync_with_queue(&self.pool.get().await, self.id, buf)
                        .await
                        .map_err(|_| "Error during queue saving")?;
                }
                self.queue
                    .push(QueueOp::Undo(SystemTime::now(), command.id));
            }
            CommandName::Redo => {
                // if current will be overflowed, clear it and save to db
                if self.queue.len() + 1 > *OPERATION_QUEUE_SIZE {
                    let mut buf = Vec::with_capacity(*OPERATION_QUEUE_SIZE);
                    buf.append(&mut self.queue);
                    sync_with_queue(&self.pool.get().await, self.id, buf)
                        .await
                        .map_err(|_| "Error during queue saving")?;
                }
                self.queue
                    .push(QueueOp::Redo(SystemTime::now(), command.id));
            }
        };

        Ok(())
    }

    /// clears self.current
    pub async fn empty_current(&mut self) -> Result<u64, tokio_postgres::Error> {
        let mut buf = Vec::with_capacity(*OPERATION_QUEUE_SIZE);
        buf.append(&mut self.queue);
        sync_with_queue(&self.pool.get().await, self.id, buf).await?;
        delete(&self.pool.get().await, self.id, &EditStatus::Current).await
    }

    /// clears self.undone
    pub async fn empty_undone(&mut self) -> Result<u64, tokio_postgres::Error> {
        let mut buf = Vec::with_capacity(*OPERATION_QUEUE_SIZE);
        buf.append(&mut self.queue);
        sync_with_queue(&self.pool.get().await, self.id, buf).await?;
        delete(&self.pool.get().await, self.id, &EditStatus::Undone).await
    }

    pub fn set_size(&mut self, height: u32, width: u32) -> Result<(), PushError> {
        if height > MAX_DIMENSION_SIZE as u32 || width > MAX_DIMENSION_SIZE as u32 {
            return Err(PushError::WrongValue("size is too big"));
        }
        self.size.height = height;
        self.size.width = width;
        Ok(())
    }
}

/// public_id - id for connection to the room
/// private_id - author's token for editing, invites, deletion etc.
/// users - room's connected users
/// board - state of the room
/// onwer_id - id of the creator, is_some if the author was authed
pub struct Room {
    pub public_id: Box<str>,
    pub private_id: Box<str>,
    pub users: WeakKeyHashMap<Weak<usize>, UserChannel>,
    pub board: Board,
    pub owner_id: Option<i32>,
}

impl Room {
    /// Adds user to the room
    pub fn add_user(&mut self, id: UserId, chan: UserChannel) {
        self.users.insert(id, chan);
    }

    /// Removes user from the room
    pub fn remove_user(&mut self, id: UserId) {
        self.users.remove(&id);
    }

    /// Updates self.co_editor_private_id and returns new one
    pub fn update_editor_private_id(&mut self) -> Box<str> {
        let id =
            (BASE64URL.encode(&HS256Key::generate().to_bytes()) + "_co_editor").into_boxed_str();
        self.board.co_editor_private_id = id.to_owned();
        id
    }
}

pub type Rooms = Arc<RwLock<HashMap<Box<str>, mpsc::UnboundedSender<UserMessage>>>>;
pub type JwtKey = Arc<HS256Key>;
pub type DbClient<'a> = PooledConnection<'static, PostgresConnectionManager<NoTls>>;
pub type UserId = Arc<usize>;
