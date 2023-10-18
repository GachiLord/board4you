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

    pub fn push(&mut self, data: String){
        // come out with smth better here
        let value: Value = serde_json::from_str(&data).unwrap();
        
        self.current.push(value.as_object().unwrap().to_owned());
    }

    pub fn exec_command(&mut self, command: Command){
        match command.name {
            CommandName::Undo => {
                let edit_index = self.current.iter().position(|e| {
                    let id = e.get("id").unwrap().as_str().unwrap();
                    return id == &command.id
                }).unwrap();
                let edit = self.current.remove(edit_index);
                self.undone.push(edit);
            }
            CommandName::Redo => {
                let edit_index = self.undone.iter().position(|e| {
                    let id = e.get("id").unwrap().as_str().unwrap();
                    return id == &command.id
                }).unwrap();
                let edit = self.undone.remove(edit_index);
                self.current.push(edit);
            }
        };
    }

    pub fn empty_current(&mut self){
        self.current.clear();
    }

    pub fn empty_undone(&mut self){
        self.undone.clear();
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