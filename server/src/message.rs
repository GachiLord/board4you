use serde_json::json;
use warp::ws::Message;
use serde::{Deserialize, Serialize};
use super::state::{Rooms, WSUsers};


#[derive(Debug, Deserialize, Serialize, Clone)]
enum BoardMessage{
    Join { room_id: String },
    Quit { room_id: String },
    // implement UpdateAction { private_key: String, action_id: String,  },
    Undo { private_key: String, action_id: String },
    Redo { private_key: String, action_id: String },
    Push { private_key: String, data: Vec<String> },
    Pull { current_len: usize, undone_len: usize },
    // info msgs
    Info { status: String, action: String, payload: String }
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

        BoardMessage::Join { room_id } => {
            let mut rooms = rooms.write().await;

            match rooms.get_mut(&room_id) {
                Some(r) => {
                    r.add_user(user_id);
                    let _ = client.send(Message::text(
                        json!({"status": "ok", "action":"Join", "payload": "connected to the room"}).to_string()
                    ));
                },
                None => {
                    let _ = client.send(Message::text(
                        json!({"status": "bad", "action":"Join", "payload": "no such room"}).to_string()
                    ));
                }
            }

        },

        BoardMessage::Quit { room_id } => {
            let mut rooms = rooms.write().await;

            match rooms.get_mut(&room_id) {
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
        _ => {
            let _ = client.send(Message::text(
                json!({"status": "bad", "action":"Unknown", "payload": "no such method"}).to_string()
            ));
        }
    }
}

