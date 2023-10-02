use serde_json::json;
use warp::ws::Message;
use serde::{Deserialize, Serialize};
use super::state::{Rooms, WSUsers};
use std::mem;


#[derive(Debug, Deserialize, Serialize, Clone)]
enum BoardMessage{
    Join { public_id: String },
    Quit { public_id: String },
    // implement UpdateAction { private_key: String, action_id: String,  },
    Undo { private_id: String, action_id: String },
    Redo { private_id: String, action_id: String },
    Push { public_id: String, private_id: String, data: Vec<String> },
    Pull { current_len: usize, undone_len: usize },
    // info msgs
    Info { status: String, action: String, payload: String },
    // data msgs
    PushData{ action: String, data: Vec<String> }
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
    // handle all msg variants
    match msg {

        BoardMessage::Join { public_id } => {
            let mut rooms = rooms.write().await;

            match rooms.get_mut(&public_id) {
                Some(r) => {
                    r.add_user(user_id);
                    let _ = client.send(Message::text(
                        json!({"status": "ok", "action":"Join", "payload": {"public_id": public_id} }).to_string()
                    ));
                },
                None => {
                    let _ = client.send(Message::text(
                        json!({"status": "bad", "action":"Join", "payload": "no such room"}).to_string()
                    ));
                }
            }

        },

        BoardMessage::Quit { public_id } => {
            let mut rooms = rooms.write().await;

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
        },
        BoardMessage::Push { public_id, private_id, mut data } => {
            let mut rooms = rooms.write().await;

            match rooms.get_mut(&public_id){
                Some(r) => {
                    // skip if private_key is not valid
                    if r.private_id != private_id{
                        return
                    }
                    // send Push msg to all room users except the sender
                    r.users.iter().for_each(|u| {
                        if u != &user_id{
                            let user = clients.get(u);
                            match user{
                                Some(user) => {
                                    let push_data = BoardMessage::PushData { action: ("Push".to_owned()), data: (mem::take(&mut data)) };
                                    let push_data = serde_json::to_string(&push_data).unwrap();
                                    let _ = user.send(Message::text(push_data));
                                },
                                None => ()
                            };
                        }
                    });
                },
                None => {
                    let _ = client.send(Message::text(
                        json!({"status": "bad", "action":"Push", "payload": "no such room"}).to_string()
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

