use serde::{Deserialize, Serialize};
use serde_json::{Value, Map};
use tokio::sync::{mpsc, RwLock};
use warp::ws::Message;
use std::{sync::Arc, collections::{HashMap, HashSet}};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Board{
    pub current: Vec<Map<String, Value>>,
    pub undone: Vec<Map<String, Value>>,
    pub size: BoardSize
}

#[derive(Debug, Deserialize, Serialize, Clone, Copy)]
pub struct BoardSize{
    height: usize,
    width: usize
}

pub struct Command{
    pub name: CommandName,
    pub id: String
}

#[derive(Debug)]
pub enum CommandName{
    Undo,
    Redo
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct EditData{
    should_be_created_edits: Vec<String>,
    should_be_deleted_ids: Vec<String>
}
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PullData{
    current: EditData,
    undone: EditData
}

impl Board {
    pub fn pull(&mut self, user_current: Vec<String>, user_undone: Vec<String>) -> PullData{
        // convert Vectors to HashSets
        let current: HashSet<String> = HashSet::from_iter(self.current.iter().map( |e| e.get("id").unwrap().to_string() ).collect::<HashSet<String>>());
        let undone: HashSet<String> = HashSet::from_iter(self.undone.iter().map( |e| e.get("id").unwrap().to_string() ).collect::<HashSet<String>>());
        let user_current: HashSet<String> = HashSet::from_iter(user_current.into_iter());
        let user_undone: HashSet<String> = HashSet::from_iter(user_undone.into_iter());
        // check current
        let current_create = current.difference(&user_current).collect::<HashSet<&String>>();
        let current_delete = user_current.difference(&current).collect::<HashSet<&String>>();
        // check undone
        let undone_create = undone.difference(&user_undone).collect::<HashSet<&String>>();
        let undone_delete = user_undone.difference(&undone).collect::<HashSet<&String>>();

        return PullData{
            current: EditData {
                should_be_created_edits: self.current.iter()
                    .filter(|e| {
                        current_create.contains::<String>(&e.get("id").unwrap().to_string())
                    })
                    .map(|v| serde_json::to_string(v).unwrap())
                    .collect(),
                should_be_deleted_ids: Vec::from_iter(current_delete.into_iter().map(|v| v.to_owned()))
            },
            undone: EditData {
                should_be_created_edits: self.undone.iter()
                    .filter(|e| {
                        undone_create.contains::<String>(&e.get("id").unwrap().to_string())
                    })
                    .map(|v| serde_json::to_string(v).unwrap())
                    .collect(),
                should_be_deleted_ids: Vec::from_iter(undone_delete.into_iter().map(|v| v.to_owned()))
            },
        };        
    }

    pub fn push(&mut self, data: String) -> Result<(), String>{
        // parse data as HashMap
        let value: Value = match serde_json::from_str(&data) {
            Ok(v) => v,
            Err(_) => return Err(String::from("data is not a json"))
        };
        let value_as_object = match value.as_object(){
            Some(v) => v,
            None => return Err(String::from("data is not an object"))
        };
        // check for id property
        Board::retrive_id(value_as_object)?;
        
        self.current.push(value_as_object.to_owned());
        Ok(())
    }

    pub fn exec_command(&mut self, command: Command) -> Result<(), String>{
        match command.name {
            CommandName::Undo => {
                let edit_index = self.current.iter().position(|e| {
                    let id = Board::retrive_id(e);
                    return id.as_ref() == Ok(&command.id)
                });
                let edit_index = match edit_index {
                    Some(id) => id,
                    None => return Err(String::from("no sush id"))
                };
                let edit = self.current.remove(edit_index);
                self.undone.push(edit);
            }
            CommandName::Redo => {
                let edit_index = self.undone.iter().position(|e| {
                    let id = Board::retrive_id(e);
                    return id.as_ref() == Ok(&command.id)
                });
                let edit_index = match edit_index {
                    Some(id) => id,
                    None => return Err(String::from("no sush id"))
                };
                let edit = self.undone.remove(edit_index);
                self.current.push(edit);
            }
        };

        Ok(())
    }

    pub fn empty_current(&mut self){
        self.current.clear();
    }

    pub fn empty_undone(&mut self){
        self.undone.clear();
    }

    fn retrive_id(item: &Map<String, Value>) -> Result<String, String>{
        // check if id is present
        let id = match item.get("id"){
            Some(id) => {
                match id.as_str() {
                    Some(id) => id,
                    None => return Err(String::from("id is not a string"))
                }
            },
            None => return Err(String::from("data has no id"))
        };

        return Ok(id.to_string())
    }
}


pub struct Room{
    pub public_id: String,
    pub private_id: String,
    pub users: HashSet<usize>,
    pub board: Board,
}

impl Room{
    pub fn add_user(&mut self, id: usize){
        self.users.insert(id);
    }

    pub fn remove_user(&mut self, id: usize){
        self.users.remove(&id);
    }
}

pub type Rooms = Arc<RwLock<HashMap<String, Room>>>;
pub type WSUsers = Arc<RwLock<HashMap<usize, mpsc::UnboundedSender<Message>>>>;