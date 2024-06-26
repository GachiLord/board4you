use super::room::{UserChannel, UserMessage};
use bb8::PooledConnection;
use bb8_postgres::PostgresConnectionManager;
use data_encoding::BASE64URL;
use datasize::DataSize;
use jwt_simple::algorithms::HS256Key;
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
#[derive(Debug, Default, Deserialize, Serialize, Clone, DataSize)]
pub struct Board {
    pub current: Vec<Edit>,
    pub undone: Vec<Edit>,
    pub size: BoardSize,
    pub title: Box<str>,
    pub co_editor_private_id: Box<str>,
}

#[derive(Debug, Deserialize, Serialize, Clone, Copy, DataSize)]
pub struct BoardSize {
    pub height: u16,
    pub width: u16,
}

// shape

const TOOL_NAMES: [&'static str; 9] = [
    "pen", "line", "arrow", "rect", "ellipse", "eraser", "move", "select", "img",
];
const SHAPE_TYPES: [&'static str; 5] = ["line", "arrow", "rect", "ellipse", "img"];
const MAX_DIMENSION_SIZE: f32 = 10_000_f32;
const MAX_IMAGE_LENGTH: u16 = 60_000;

#[derive(Serialize, Deserialize, Debug, Clone, DataSize)]
struct Shape {
    x: f32,
    y: f32,
    tool: Box<str>,
    shape_type: Box<str>,
    shape_id: Box<str>,
    color: Option<Box<str>>,
    line_size: Option<u16>,
    line_type: Option<Box<str>>,
    height: Option<f32>,
    width: Option<f32>,
    radius_x: Option<f32>,
    radius_y: Option<f32>,
    rotation: Option<f32>,
    scale_x: Option<f32>,
    scale_y: Option<f32>,
    skew_x: Option<f32>,
    skew_y: Option<f32>,
    points: Option<Vec<u16>>,
    connected: Option<Vec<Box<str>>>,
    url: Option<Box<str>>,
}

// edits

#[derive(Serialize, Deserialize, Debug, Clone, DataSize)]
pub struct Add {
    id: Box<str>,
    edit_type: Box<str>,
    shape: Shape,
}

#[derive(Serialize, Deserialize, Debug, Clone, DataSize)]
pub struct Remove {
    id: Box<str>,
    edit_type: Box<str>,
    shapes: Vec<Shape>,
}

#[derive(Serialize, Deserialize, Debug, Clone, DataSize)]
pub struct Modify {
    id: Box<str>,
    edit_type: Box<str>,
    current: Vec<Shape>,
    initial: Vec<Shape>,
}

#[derive(Serialize, Deserialize, Debug, Clone, DataSize)]
pub enum Edit {
    Add(Add),
    Remove(Remove),
    Modify(Modify),
}

impl Edit {
    fn id(&self) -> &str {
        match self {
            Edit::Add(e) => &e.id,
            Edit::Remove(e) => &e.id,
            Edit::Modify(e) => &e.id,
        }
    }
    fn edit_type(&self) -> &str {
        match self {
            Edit::Add(e) => &e.edit_type,
            Edit::Remove(e) => &e.edit_type,
            Edit::Modify(e) => &e.edit_type,
        }
    }
}

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

#[derive(Debug, Deserialize, Serialize, Clone)]
struct EditData {
    should_be_created_edits: Vec<Edit>,
    should_be_deleted_ids: Vec<Box<str>>,
}
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PullData {
    current: EditData,
    undone: EditData,
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
                .map(|e| e.id())
                .collect::<HashSet<&str>>(),
        );
        let undone: HashSet<&str> = HashSet::from_iter(
            self.undone
                .iter()
                .map(|e| e.id())
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
            current: EditData {
                should_be_created_edits: self
                    .current
                    .clone()
                    .into_iter()
                    .filter(|e| {
                        current_create.contains::<Box<str>>(&e.id().to_string().into_boxed_str())
                    })
                    .collect(),
                should_be_deleted_ids: Vec::from_iter(
                    current_delete.into_iter().map(|v| v.to_owned()),
                ),
            },
            undone: EditData {
                should_be_created_edits: self
                    .undone
                    .clone()
                    .into_iter()
                    .filter(|e| {
                        undone_create.contains::<Box<str>>(&e.id().to_string().into_boxed_str())
                    })
                    .collect(),
                should_be_deleted_ids: Vec::from_iter(
                    undone_delete.into_iter().map(|v| v.to_owned()),
                ),
            },
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
        // check id
        if edit.id().len() != 36 {
            return Err(PushError::WrongValue("id must be 36 chars long"));
        }
        // check edit_type
        let edit_type = edit.edit_type();
        if edit_type != "add" && edit_type != "remove" && edit_type != "modify" {
            return Err(PushError::WrongValue("wrong edit_type"));
        }
        // check shapes
        match edit {
            Edit::Add(ref e) => Board::validate_shape(&e.shape)?,
            Edit::Remove(ref e) => {
                for shape in e.shapes.iter() {
                    Board::validate_shape(&shape)?;
                }
            }
            Edit::Modify(ref e) => {
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
        if !TOOL_NAMES.contains(&shape.tool.as_ref()) {
            return Err(PushError::WrongValue("no such tool"));
        }
        if !SHAPE_TYPES.contains(&shape.shape_type.as_ref()) {
            return Err(PushError::WrongValue("no such shape_type"));
        }
        if shape.line_size.unwrap_or(0) > MAX_DIMENSION_SIZE as u16 {
            return Err(PushError::WrongValue("line_size is too large"));
        }
        if shape.height.unwrap_or(0.0) > MAX_DIMENSION_SIZE
            || shape.width.unwrap_or(0.0) > MAX_DIMENSION_SIZE
        {
            return Err(PushError::WrongValue("height or width is too large"));
        }
        if shape.radius_x.unwrap_or(0.0) > MAX_DIMENSION_SIZE
            || shape.radius_y.unwrap_or(0.0) > MAX_DIMENSION_SIZE
        {
            return Err(PushError::WrongValue("radius_x or radius_y is too large"));
        }
        if shape.scale_x.unwrap_or(0.0) > MAX_DIMENSION_SIZE
            || shape.scale_y.unwrap_or(0.0) > MAX_DIMENSION_SIZE
        {
            return Err(PushError::WrongValue("scale_x or scale_y is too large"));
        }
        match shape.url {
            Some(ref url) => {
                if url.len().try_into().unwrap_or(u16::MAX) > MAX_IMAGE_LENGTH {
                    return Err(PushError::WrongValue("image is too large"));
                }
            }
            None => (),
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
                    .position(|e| e.id() == command.id.as_ref());
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
                    .position(|e| e.id() == command.id.as_ref());
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

    pub fn set_size(&mut self, height: u16, width: u16) -> Result<(), PushError> {
        if height > MAX_DIMENSION_SIZE as u16 || width > MAX_DIMENSION_SIZE as u16 {
            return Err(PushError::WrongValue("size is too big"));
        }
        self.size.height = height;
        self.size.width = width;
        Ok(())
    }
}

impl Default for BoardSize {
    fn default() -> Self {
        BoardSize {
            height: (1720),
            width: (900),
        }
    }
}

/// public_id - id for connection to the room
/// private_id - author's token for editing, invites, deletion etc.
/// users - room's connected users
/// board - state of the room
/// onwer_id - id of the creator, is_some if the author was authed
#[derive(Debug, Default, DataSize)]
pub struct Room {
    pub public_id: Box<str>,
    pub private_id: Box<str>,
    #[data_size(with = estimate_weak)]
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
