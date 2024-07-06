use super::room::{UserChannel, UserMessage};
use bb8::PooledConnection;
use bb8_postgres::PostgresConnectionManager;
use data_encoding::BASE64URL;
use jwt_simple::algorithms::HS256Key;
use protocol::board_protocol::{
    edit::Edit as EditInner, BoardSize, Edit, EditData, PullData, Shape,
};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    mem::size_of_val,
    sync::{Arc, Weak},
};
use tokio::sync::{mpsc, RwLock};
use tokio_postgres::NoTls;
use weak_table::WeakKeyHashMap;

/// current - edits that are accepted
/// undone - edits that are not accepted
/// size - canvas size
/// title - board's title
/// co_editor_private_id - token for co-editors, may change if author asks
#[derive(Debug, Default, Deserialize, Serialize, Clone)]
pub struct Board {
    pub current: Vec<Edit>,
    pub undone: Vec<Edit>,
    pub size: BoardSize,
    pub title: Box<str>,
    pub co_editor_private_id: Box<str>,
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
}

impl ToString for PushError {
    fn to_string(&self) -> String {
        match self {
            Self::WrongValue(msg) => msg.to_string(),
        }
    }
}

trait ExposeId {
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
    pub fn pull(&self, user_current: Vec<Box<str>>, user_undone: Vec<Box<str>>) -> PullData {
        // convert Vectors to HashSets
        let current: HashSet<&str> = HashSet::from_iter(
            self.current
                .iter()
                // unwrap is allowed because we don't save empty edits
                .map(|e| e.edit.as_ref().unwrap().id())
                .collect::<HashSet<&str>>(),
        );
        let undone: HashSet<&str> = HashSet::from_iter(
            self.undone
                .iter()
                .map(|e| e.edit.as_ref().unwrap().id())
                .collect::<HashSet<&str>>(),
        );
        let user_current: HashSet<&str> =
            HashSet::from_iter(user_current.iter().map(|e| e.as_ref()));
        let user_undone: HashSet<&str> = HashSet::from_iter(user_undone.iter().map(|e| e.as_ref()));
        // check current
        let current_create: HashSet<Box<str>> = current
            .iter()
            .filter_map(|e| match !user_current.contains(*e) {
                true => return Some(e.to_string().into_boxed_str()),
                false => return None,
            })
            .collect();
        let current_delete: HashSet<Box<str>> = user_current
            .iter()
            .filter_map(|e| match !user_current.contains(*e) {
                true => return Some(e.to_string().into_boxed_str()),
                false => return None,
            })
            .collect();
        // check undone
        let undone_create: HashSet<Box<str>> = undone
            .iter()
            .filter_map(|e| match !user_undone.contains(*e) {
                true => return Some(e.to_string().into_boxed_str()),
                false => return None,
            })
            .collect();
        let undone_delete: HashSet<Box<str>> = user_undone
            .iter()
            .filter_map(|e| match !undone.contains(*e) {
                true => return Some(e.to_string().into_boxed_str()),
                false => return None,
            })
            .collect();

        return PullData {
            current: Some(EditData {
                should_be_created_edits: self
                    .current
                    .clone()
                    .into_iter()
                    .filter(|e| {
                        current_create.contains::<Box<str>>(
                            &e.edit.as_ref().unwrap().id().to_string().into_boxed_str(),
                        )
                    })
                    .collect(),
                should_be_deleted_ids: Vec::from_iter(current_delete.into_iter().map(|v| v.into())),
            }),
            undone: Some(EditData {
                should_be_created_edits: self
                    .undone
                    .clone()
                    .into_iter()
                    .filter(|e| {
                        undone_create.contains::<Box<str>>(
                            &e.edit.as_ref().unwrap().id().to_string().into_boxed_str(),
                        )
                    })
                    .collect(),
                should_be_deleted_ids: Vec::from_iter(undone_delete.into_iter().map(|v| v.into())),
            }),
        };
    }

    /// Pushes a new edit to self.current
    ///
    /// # Errors
    ///
    /// This function will return an error:
    /// - if the edit is not a json
    /// - if the edit has no id property
    /// - if the edit_type is not add or remove or modify
    pub fn push(&mut self, edit: Edit) -> Result<(), PushError> {
        if edit.edit.is_none() {
            return Err(PushError::WrongValue("edit is None"));
        }
        // check id
        if edit.edit.as_ref().unwrap().id().len() != 36 {
            return Err(PushError::WrongValue("id must be 36 chars long"));
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
        // push changes
        self.current.push(edit);
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
    pub fn exec_command(&mut self, command: Command) -> Result<(), &'static str> {
        match command.name {
            CommandName::Undo => {
                let edit_index = self
                    .current
                    .iter()
                    // unwrap is allowed because we don't save empty edits
                    .position(|e| e.edit.as_ref().unwrap().id() == command.id.as_ref());
                let edit_index = match edit_index {
                    Some(id) => id,
                    None => return Err("no sush id"),
                };
                let edit = self.current.remove(edit_index);
                self.undone.push(edit);
            }
            CommandName::Redo => {
                let edit_index = self
                    .undone
                    .iter()
                    // unwrap is allowed because we don't save empty edits
                    .position(|e| e.edit.as_ref().unwrap().id() == command.id.as_ref());
                let edit_index = match edit_index {
                    Some(id) => id,
                    None => return Err("no sush id"),
                };
                let edit = self.undone.remove(edit_index);
                self.current.push(edit);
            }
        };

        Ok(())
    }

    /// clears self.current
    pub fn empty_current(&mut self) {
        self.current.clear();
    }

    /// clears self.undone
    pub fn empty_undone(&mut self) {
        self.undone.clear();
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
#[derive(Debug, Default)]
pub struct Room {
    pub public_id: Box<str>,
    pub private_id: Box<str>,
    pub users: WeakKeyHashMap<Weak<usize>, UserChannel>,
    pub board: Board,
    pub owner_id: Option<i32>,
}

fn estimate_weak(value: &WeakKeyHashMap<Weak<usize>, UserChannel>) -> usize {
    // We assume every item is 512 bytes in heap size.
    value.len() * size_of_val(&usize::MAX)
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
