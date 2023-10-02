use serde::{Deserialize, Serialize};
use tokio::sync::{mpsc, RwLock};
use warp::ws::Message;
use std::{sync::Arc, collections::{HashMap, HashSet}};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Board{
    pub current: Vec<String>,
    pub undone: Vec<String>
}

#[derive(Clone)]
pub struct Command{
    name: String,
    id: String
} 

impl Board {
    fn pull(&mut self, current_len: usize, undone_len: usize){
        // implement
    }

    fn push(&mut self, data: String){
        self.current.push(data)
    }

    fn exec_command(&mut self, command: &Command){
        // match command {
        //     "undo" => {
        //         println!("undo");
        //     },
        //     "redo" => {
        //         println!("redo");
        //     },
        //     _ => {
        //         println!("unknown command");
        //     }
        // };
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