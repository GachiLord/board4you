use jwt_simple::algorithms::HS256Key;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::{
    collections::{HashMap, HashSet},
    sync::{Arc, Weak},
};
use tokio::sync::{mpsc, RwLock};
use tokio_postgres::Client;
use warp::ws::Message;
use weak_table::WeakHashSet;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Board {
    pub current: Vec<Map<String, Value>>,
    pub undone: Vec<Map<String, Value>>,
    pub size: BoardSize,
    pub title: String,
}

#[derive(Debug, Deserialize, Serialize, Clone, Copy)]
pub struct BoardSize {
    height: usize,
    width: usize,
}

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
    should_be_created_edits: Vec<String>,
    should_be_deleted_ids: Vec<String>,
}
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PullData {
    current: EditData,
    undone: EditData,
}

impl Board {
    pub fn pull(&mut self, user_current: Vec<String>, user_undone: Vec<String>) -> PullData {
        // convert Vectors to HashSets
        let current: HashSet<&str> = HashSet::from_iter(
            self.current
                .iter()
                .map(|e| e.get("id").unwrap().as_str().unwrap())
                .collect::<HashSet<&str>>(),
        );
        let undone: HashSet<&str> = HashSet::from_iter(
            self.undone
                .iter()
                .map(|e| e.get("id").unwrap().as_str().unwrap())
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
                    .iter()
                    .filter(|e| {
                        current_create
                            .contains::<String>(&e.get("id").unwrap().as_str().unwrap().to_string())
                    })
                    .map(|v| serde_json::to_string(v).unwrap())
                    .collect(),
                should_be_deleted_ids: Vec::from_iter(
                    current_delete.into_iter().map(|v| v.to_owned()),
                ),
            },
            undone: EditData {
                should_be_created_edits: self
                    .undone
                    .iter()
                    .filter(|e| {
                        undone_create
                            .contains::<String>(&e.get("id").unwrap().as_str().unwrap().to_string())
                    })
                    .map(|v| serde_json::to_string(v).unwrap())
                    .collect(),
                should_be_deleted_ids: Vec::from_iter(
                    undone_delete.into_iter().map(|v| v.to_owned()),
                ),
            },
        };
    }

    pub fn push(&mut self, data: String) -> Result<(), &'static str> {
        // parse data as HashMap
        let value: Value = match serde_json::from_str(&data) {
            Ok(v) => v,
            Err(_) => return Err("data is not a json"),
        };
        let value_as_object = match value.as_object() {
            Some(v) => v,
            None => return Err("data is not an object"),
        };
        // check for id property
        Board::retrive_id(value_as_object)?;
        // push changes
        self.current.push(value_as_object.to_owned());
        Ok(())
    }

    pub fn exec_command(&mut self, command: Command) -> Result<(), &'static str> {
        match command.name {
            CommandName::Undo => {
                let edit_index = self.current.iter().position(|e| {
                    let id = Board::retrive_id(e);
                    return id.as_ref() == Ok(&command.id);
                });
                let edit_index = match edit_index {
                    Some(id) => id,
                    None => return Err("no sush id"),
                };
                let edit = self.current.remove(edit_index);
                self.undone.push(edit);
            }
            CommandName::Redo => {
                let edit_index = self.undone.iter().position(|e| {
                    let id = Board::retrive_id(e);
                    return id.as_ref() == Ok(&command.id);
                });
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

    pub fn empty_current(&mut self) {
        self.current.clear();
    }

    pub fn empty_undone(&mut self) {
        self.undone.clear();
    }

    fn retrive_id(item: &Map<String, Value>) -> Result<String, &'static str> {
        // check if id is present
        let id = match item.get("id") {
            Some(id) => match id.as_str() {
                Some(id) => id,
                None => return Err("id is not a string"),
            },
            None => return Err("data has no id"),
        };

        return Ok(id.to_string());
    }
}

impl Default for Board {
    fn default() -> Self {
        Board {
            current: (vec![]),
            undone: (vec![]),
            size: (BoardSize {
                height: (1720),
                width: (900),
            }),
            title: "".to_string(),
        }
    }
}

#[derive(Debug)]
pub struct Room {
    pub public_id: String,
    pub private_id: String,
    pub users: WeakHashSet<Weak<usize>>,
    pub board: Board,
    pub owner_id: Option<i32>,
}

impl Room {
    pub fn add_user(&mut self, id: Arc<usize>) {
        self.users.insert(id);
    }

    pub fn remove_user(&mut self, id: Arc<usize>) {
        self.users.remove(&id);
    }
}

impl Default for Room {
    fn default() -> Self {
        Room {
            public_id: ("".to_string()),
            private_id: ("".to_string()),
            users: (WeakHashSet::default()),
            board: Board::default(),
            owner_id: None,
        }
    }
}

pub type Rooms = Arc<RwLock<HashMap<String, Room>>>;
pub type WSUsers = Arc<RwLock<HashMap<Arc<usize>, mpsc::UnboundedSender<Message>>>>;
pub type JwtKey = Arc<HS256Key>;
pub type DbClient = Arc<Client>;

