use super::room::UserMessage;
use data_encoding::BASE64URL;
use jwt_simple::algorithms::HS256Key;
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    sync::{Arc, Weak},
};
use tokio::sync::{mpsc, RwLock};
use tokio_postgres::Client;
use warp::ws::Message;
use weak_table::WeakHashSet;

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
    pub title: String,
    pub co_editor_private_id: String,
}

#[derive(Debug, Deserialize, Serialize, Clone, Copy)]
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

#[derive(Serialize, Deserialize, Debug, Clone)]
struct Shape {
    x: f32,
    y: f32,
    tool: String,
    shape_type: String,
    shape_id: String,
    color: Option<String>,
    line_size: Option<u16>,
    line_type: Option<String>,
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
    connected: Option<Vec<String>>,
    url: Option<String>,
}

// edits

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Add {
    id: String,
    edit_type: String,
    shape: Shape,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Remove {
    id: String,
    edit_type: String,
    shapes: Vec<Shape>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Modify {
    id: String,
    edit_type: String,
    current: Vec<Shape>,
    initial: Vec<Shape>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
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
    pub id: String,
}

#[derive(Debug)]
pub enum CommandName {
    Undo,
    Redo,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct EditData {
    should_be_created_edits: Vec<Edit>,
    should_be_deleted_ids: Vec<String>,
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
    pub fn pull(&self, user_current: Vec<String>, user_undone: Vec<String>) -> PullData {
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
        let current_create: HashSet<String> = current
            .iter()
            .filter_map(|e| match !user_current.contains(*e) {
                true => return Some(e.to_string()),
                false => return None,
            })
            .collect();
        let current_delete: HashSet<String> = user_current
            .iter()
            .filter_map(|e| match !user_current.contains(*e) {
                true => return Some(e.to_string()),
                false => return None,
            })
            .collect();
        // check undone
        let undone_create: HashSet<String> = undone
            .iter()
            .filter_map(|e| match !user_undone.contains(*e) {
                true => return Some(e.to_string()),
                false => return None,
            })
            .collect();
        let undone_delete: HashSet<String> = user_undone
            .iter()
            .filter_map(|e| match !undone.contains(*e) {
                true => return Some(e.to_string()),
                false => return None,
            })
            .collect();

        return PullData {
            current: EditData {
                should_be_created_edits: self
                    .current
                    .clone()
                    .into_iter()
                    .filter(|e| current_create.contains::<String>(&e.id().to_string()))
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
                    .filter(|e| undone_create.contains::<String>(&e.id().to_string()))
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
        if !TOOL_NAMES.contains(&shape.tool.as_str()) {
            return Err(PushError::WrongValue("no such tool"));
        }
        if !SHAPE_TYPES.contains(&shape.shape_type.as_str()) {
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
                let edit_index = self.current.iter().position(|e| e.id() == command.id);
                let edit_index = match edit_index {
                    Some(id) => id,
                    None => return Err("no sush id"),
                };
                let edit = self.current.remove(edit_index);
                self.undone.push(edit);
            }
            CommandName::Redo => {
                let edit_index = self.undone.iter().position(|e| e.id() == command.id);
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
#[derive(Debug, Default)]
pub struct Room {
    pub public_id: String,
    pub private_id: String,
    pub users: WeakHashSet<Weak<usize>>,
    pub board: Board,
    pub owner_id: Option<i32>,
}

impl Room {
    /// Adds user to the room
    pub fn add_user(&mut self, id: UserId) {
        self.users.insert(id);
    }

    /// Removes user from the room
    pub fn remove_user(&mut self, id: UserId) {
        self.users.remove(&id);
    }

    /// Updates self.co_editor_private_id and returns new one
    pub fn update_editor_private_id(&mut self) -> String {
        let editor_private_id = BASE64URL.encode(&HS256Key::generate().to_bytes()) + "_co_editor";
        self.board.co_editor_private_id = editor_private_id.to_owned();
        editor_private_id
    }
}

pub type Rooms = Arc<RwLock<HashMap<String, mpsc::UnboundedSender<UserMessage>>>>;
pub type WSUsers = Arc<RwLock<HashMap<Arc<usize>, mpsc::UnboundedSender<Message>>>>;
pub type JwtKey = Arc<HS256Key>;
pub type DbClient = Arc<Client>;
pub type UserId = Arc<usize>;
