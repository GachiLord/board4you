use serde_json::json;
use tokio::sync::{RwLockReadGuard, mpsc::UnboundedSender};
use warp::ws::Message;
use serde::{Deserialize, Serialize};
use crate::state::{Room, BoardSize};

use super::state::{Rooms, WSUsers, PullData};
use std::{mem, collections::HashMap};


#[derive(Debug, Deserialize, Serialize, Clone)]
enum BoardMessage{
    Join { public_id: String },
    Quit { public_id: String },
    // implement UpdateAction { private_key: String, action_id: String,  },
    UndoRedo { private_id: String, public_id: String, action_type: String, action_id: String },
    Empty { private_id: String, public_id: String, action_type: String },
    Push { public_id: String, private_id: String, data: Vec<String> },
    PushSegment { public_id: String, private_id: String, action_type: String, data: String },
    SetSize { public_id: String, private_id: String, data: BoardSize },
    Pull { public_id: String, current: Vec<String>, undone: Vec<String> }, 
    // info msgs
    Info { status: String, action: String, payload: String },
    // data msgs
    PullData (PullData),
    PushData{ action: String, data: Vec<String> },
    PushSegmentData{ action_type: String, data: String },
    UndoRedoData { action_type: String, action_id: String },
    EmptyData { action_type: String },
    SizeData { data: BoardSize }
}

pub async fn user_message(user_id: usize, msg: Message, users: &WSUsers, rooms: &Rooms) {
    // looks weird
    let msg: BoardMessage = match msg.to_str(){
        Ok(s) => match serde_json::from_str(s) {
            Ok(j) => j,
            Err(_) => return
        },
        Err(_) => return
    };
    // check if user exists
    let clients = users.read().await;
    let client = clients.get(&user_id).expect("WsUser does not exist");
    let mut rooms = rooms.write().await;
    // handle all msg variants
    match msg {

        BoardMessage::Join { public_id } => {
        
            match rooms.get_mut(&public_id) {
                Some(r) => {
                    r.add_user(user_id);
                    let _ = client.send(Message::text(
                        json!({"status": "ok", "action":"Join", "payload": {"public_id": public_id} }).to_string()
                    ));
                    let _ = client.send(Message::text(
                        serde_json::to_string(&BoardMessage::SizeData { data: (r.board.size) }).unwrap()
                    ));
                },
                None => {
                    let _ = client.send(Message::text(
                        json!({"status": "bad", "action":"Join", "payload": "no such room"}).to_string()
                    ));
                }
            }

        }

        BoardMessage::Quit { public_id } => {

            match rooms.get_mut(&public_id) {
                Some(r) => {
                    r.remove_user(user_id);
                    let _ = client.send(Message::text(
                        json!({"status": "ok", "action":"Quit", "payload": "disconnected from the room"}).to_string()
                    ));
                },
                None => {
                    let _ = client.send(Message::text(
                        json!({"status": "bad", "action":"Quit", "payload": "no such room"}).to_string()
                    ));
                }
            }
        }
        BoardMessage::Push { public_id, private_id, mut data } => {
            let clients = users.read().await;

            match rooms.get_mut(&public_id){
                Some(r) => {
                    // skip if private_key is not valid
                    if r.private_id != private_id{
                        return
                    }
                    // form data
                    let push_data = BoardMessage::PushData { action: ("Push".to_owned()), data: (mem::take(&mut data)) };
                    let push_data = serde_json::to_string(&push_data).unwrap();
                    // save changes
                    data.iter().for_each( |edit| r.board.push(edit.to_string()) );
                    // send
                    send_all_except_sender(clients, r, user_id, push_data);
                },
                None => {
                    let _ = client.send(Message::text(
                        json!({"status": "bad", "action":"Push", "payload": "no such room"}).to_string()
                    ));
                }
            };
        }

        BoardMessage::PushSegment { public_id, private_id, action_type, data } => {

            match rooms.get_mut(&public_id){
                Some(r) => {
                    // skip if private_key is not valid
                    if r.private_id != private_id{
                        return
                    }
                    // form PushSegment msg
                    let response = BoardMessage::PushSegmentData { action_type: (action_type), data: (data) };
                    let response = serde_json::to_string(&response).unwrap();
                    // send
                    send_all_except_sender(clients, r, user_id, response);
                },
                None => {
                    let _ = client.send(Message::text(
                        json!({"status": "bad", "action":"PushSegment", "payload": "no such room"}).to_string()
                    ));
                }
            }
        }

        BoardMessage::UndoRedo { private_id, public_id, action_type, action_id } => {
            match rooms.get_mut(&public_id){
                Some(r) => {
                    // skip if private_key is not valid
                    if r.private_id != private_id{
                        return
                    }
                    // form UndoRedo msg 
                    let response = BoardMessage::UndoRedoData { action_type: (action_type), action_id: (action_id) };
                    let response = serde_json::to_string(&response).unwrap();
                    // send
                    send_all_except_sender(clients, r, user_id, response);
                },
                None => {
                    let _ = client.send(Message::text(
                        json!({"status": "bad", "action":"UndoRedo", "payload": "no such room"}).to_string()
                    ));
                }
            }
        }

        BoardMessage::Empty { private_id, public_id, action_type } => {
            match rooms.get_mut(&public_id){
                Some(r) => {
                    // skip if private_key is not valid
                    if r.private_id != private_id{
                        return
                    }
                    // form EmptyData msg 
                    let response = BoardMessage::EmptyData { action_type: (action_type) };
                    let response = serde_json::to_string(&response).unwrap();
                    // send
                    send_all_except_sender(clients, r, user_id, response);
                },
                None => {
                    let _ = client.send(Message::text(
                        json!({"status": "bad", "action":"UndoRedo", "payload": "no such room"}).to_string()
                    ));
                }
            }
        }

        BoardMessage::SetSize { private_id, public_id, data } => {
            match rooms.get_mut(&public_id){
                Some(r) => {
                    // skip if private_key is not valid
                    if r.private_id != private_id{
                        return
                    }
                    // update board state
                    r.board.size = data;
                    // form SetSize msg 
                    let response = BoardMessage::SizeData { data: (data) };
                    let response = serde_json::to_string(&response).unwrap();
                    // send
                    send_all_except_sender(clients, r, user_id, response);
                },
                None => {
                    let _ = client.send(Message::text(
                        json!({"status": "bad", "action": "SetSize", "payload": "no such room"}).to_string()
                    ));
                }
            }
        }
        
        BoardMessage::Pull { public_id, current, undone } => {
            match rooms.get_mut(&public_id){
                Some(r) => {
                    let pull_data = BoardMessage::PullData(r.board.pull(current, undone));
                    let _ = client.send(Message::text(
                        serde_json::to_string(&pull_data).unwrap()
                    ));
                },
                None => {
                    let _ = client.send(Message::text(
                        json!({"status": "bad", "action": "Pull", "payload": "no such room"}).to_string()
                    ));
                }
            }
        }

        _ => {
            let _ = client.send(Message::text(
                json!({"status": "bad", "action":"Unknown", "payload": "no such method"}).to_string()
            ));
        }
    }
}

fn send_all_except_sender(
    clients: RwLockReadGuard<'_, HashMap<usize, UnboundedSender<Message>>>, 
    room: &Room,
    sender_id: usize, 
    mut data: String)
{

    // send Push msg to all room users except the sender
    room.users.iter().for_each(|u| {
        if u != &sender_id{
            let user = clients.get(u);
            match user{
                Some(user) => {
                    let _ = user.send(Message::text(mem::take(&mut data)));
                },
                None => ()
            };
        }
    });
}