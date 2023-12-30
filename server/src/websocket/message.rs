use crate::entities::board::get;
use crate::libs::state::{BoardSize, Command, CommandName, Room};
use crate::libs::state::{PullData, Rooms, WSUsers};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{collections::HashMap, mem, sync::Arc};
use tokio::sync::{mpsc::UnboundedSender, RwLockReadGuard};
use tokio_postgres::Client;
use warp::ws::Message;
use weak_table::WeakHashSet;

#[derive(Debug, Deserialize, Serialize, Clone)]
enum BoardMessage {
    Join {
        public_id: String,
    },
    Quit {
        public_id: String,
    },
    SetTitle {
        private_id: String,
        public_id: String,
        title: String,
    },
    UndoRedo {
        private_id: String,
        public_id: String,
        action_type: String,
        action_id: String,
    },
    Empty {
        private_id: String,
        public_id: String,
        action_type: String,
    },
    Push {
        public_id: String,
        private_id: String,
        data: Vec<String>,
        silent: bool,
    },
    PushSegment {
        public_id: String,
        private_id: String,
        action_type: String,
        data: String,
    },
    SetSize {
        public_id: String,
        private_id: String,
        data: BoardSize,
    },
    Pull {
        public_id: String,
        current: Vec<String>,
        undone: Vec<String>,
    },
    // info msgs
    Info {
        status: String,
        action: String,
        payload: String,
    },
    // data msgs
    PullData(PullData),
    PushData {
        action: String,
        data: Vec<String>,
    },
    PushSegmentData {
        action_type: String,
        data: String,
    },
    UndoRedoData {
        action_type: String,
        action_id: String,
    },
    EmptyData {
        action_type: String,
    },
    SizeData {
        data: BoardSize,
    },
    TitleData {
        title: String,
    },
}

pub async fn user_message(
    user_id: Arc<usize>,
    msg: Message,
    db_client: &Arc<Client>,
    users: &WSUsers,
    rooms: &Rooms,
) {
    // looks weird
    let msg: BoardMessage = match msg.to_str() {
        Ok(s) => match serde_json::from_str(s) {
            Ok(j) => j,
            Err(_) => return,
        },
        Err(_) => return,
    };
    // clients and rooms
    let clients = users.read().await;
    let client = clients.get(&user_id).expect("WsUser does not exist");
    // handle all msg variants
    match msg {
        BoardMessage::Join { public_id } => {
            fn send_join_info(
                public_id: String,
                board_size: BoardSize,
                title: String,
                client: &UnboundedSender<Message>,
            ) {
                let _ = client.send(Message::text(
                    json!({ "Info": {"status": "ok", "action":"Join", "payload": {"public_id": public_id} } }).to_string()
                ));
                let _ = client.send(Message::text(
                    serde_json::to_string(&BoardMessage::SizeData { data: (board_size) }).unwrap(),
                ));
                let _ = client.send(Message::text(
                    serde_json::to_string(&BoardMessage::TitleData { title: (title) }).unwrap(),
                ));
            }
            let mut rooms = rooms.write().await;

            match rooms.get_mut(&public_id) {
                Some(r) => {
                    r.add_user(user_id.to_owned());
                    send_join_info(
                        public_id.to_owned(),
                        r.board.size,
                        r.board.title.clone(),
                        client,
                    );
                }
                None => match get(&db_client, &public_id).await {
                    Ok((private_id, board)) => {
                        let room = Room {
                            public_id: public_id.to_owned(),
                            private_id,
                            board,
                            users: WeakHashSet::new(),
                            owner_id: None,
                        };
                        send_join_info(
                            public_id.to_owned(),
                            room.board.size,
                            room.board.title.clone(),
                            client,
                        );
                        rooms.insert(public_id, room);
                    }
                    Err(_) => {
                        let _ = client.send(Message::text(
                                json!({ "Info": {"status": "bad", "action":"Join", "payload": "no such room"} }).to_string()
                            ));
                    }
                },
            }
        }

        BoardMessage::Quit { public_id } => match rooms.write().await.get_mut(&public_id) {
            Some(r) => {
                r.remove_user(user_id);
                let _ = client.send(Message::text(
                        json!({ "Info": {"status": "ok", "action":"Quit", "payload": "disconnected from the room"} }).to_string()
                    ));
            }
            None => {
                let _ = client.send(Message::text(
                    json!({"Info": {"status": "bad", "action":"Quit", "payload": "no such room"} })
                        .to_string(),
                ));
            }
        },

        BoardMessage::SetTitle {
            private_id,
            public_id,
            title,
        } => match rooms.write().await.get_mut(&public_id) {
            None => {
                let _ = client.send(Message::text(
                        json!({"Info": {"status": "bad", "action":"SetTitle", "payload": "no such room"} }).to_string(),
                ));
            }
            Some(r) => {
                // skip if private_key is not valid
                if r.private_id != private_id {
                    send_to_user(
                        client,
                        json!({
                        "Info": {"status": "bad", "action":"Push", "payload": "private_id is invalid"}
                        }),
                    );
                    return;
                }
                // changes
                r.board.title = title.clone();
                let title_msg = BoardMessage::TitleData { title };
                // send changes
                send_all_except_sender(
                    clients,
                    r,
                    user_id,
                    serde_json::to_string(&title_msg).unwrap(),
                );
            }
        },

        BoardMessage::Push {
            public_id,
            private_id,
            mut data,
            silent,
        } => {
            let clients = users.read().await;

            match rooms.write().await.get_mut(&public_id) {
                Some(r) => {
                    // skip if private_key is not valid
                    if r.private_id != private_id {
                        send_to_user(
                            client,
                            json!({
                                "Info": {"status": "bad", "action":"Push", "payload": "private_id is invalid"}
                            }),
                        );
                        return;
                    }
                    // save changes and validate data
                    data.iter()
                        .for_each(|edit| match r.board.push(edit.to_owned()) {
                            Ok(()) => (),
                            Err(e) => send_to_user(
                                client,
                                json!({
                                    "Info": {"status": "bad", "action":"Push", "payload": e}
                                }),
                            ),
                        });
                    // form data
                    let push_data = BoardMessage::PushData {
                        action: ("Push".to_owned()),
                        data: (mem::take(&mut data)),
                    };
                    let push_data = serde_json::to_string(&push_data).unwrap();
                    // send
                    if !silent {
                        send_all_except_sender(clients, r, user_id, push_data);
                    }
                }
                None => {
                    let _ = client.send(Message::text(
                        json!({ "Info": {"status": "bad", "action":"Push", "payload": "no such room"} }).to_string()
                    ));
                }
            };
        }

        BoardMessage::PushSegment {
            public_id,
            private_id,
            action_type,
            data,
        } => {
            match rooms.read().await.get(&public_id) {
                Some(r) => {
                    // skip if private_key is not valid
                    if r.private_id != private_id {
                        send_to_user(
                            client,
                            json!({
                                "Info": {"status": "bad", "action":"PushSegment", "payload": "private_id is invalid"}
                            }),
                        );
                        return;
                    }
                    // form PushSegment msg
                    let response = BoardMessage::PushSegmentData {
                        action_type: (action_type),
                        data: (data),
                    };
                    let response = serde_json::to_string(&response).unwrap();
                    // send
                    send_all_except_sender(clients, r, user_id, response);
                }
                None => {
                    let _ = client.send(Message::text(
                        json!({"Info": {"status": "bad", "action":"PushSegment", "payload": "no such room"}}).to_string()
                    ));
                }
            }
        }

        BoardMessage::UndoRedo {
            private_id,
            public_id,
            action_type,
            action_id,
        } => {
            match rooms.write().await.get_mut(&public_id) {
                Some(r) => {
                    // skip if private_key is not valid
                    if r.private_id != private_id {
                        send_to_user(
                            client,
                            json!({
                                "Info": {"status": "bad", "action":"UndoRedo", "payload": "private_id is invalid"}
                            }),
                        );
                        return;
                    }
                    // form UndoRedo msg
                    let response = BoardMessage::UndoRedoData {
                        action_type: (action_type.to_owned()),
                        action_id: (action_id.to_owned()),
                    };
                    let response = serde_json::to_string(&response).unwrap();
                    // determine command name
                    let command_name = if action_type == "Undo" {
                        CommandName::Undo
                    } else {
                        CommandName::Redo
                    };
                    // save changes
                    let exec_command = r.board.exec_command(Command {
                        name: command_name,
                        id: action_id,
                    });
                    // handle command result
                    match exec_command {
                        Ok(()) => {
                            send_all_except_sender(clients, r, user_id, response);
                        }
                        Err(e) => send_to_user(
                            client,
                            json!({
                                "Info": {"status": "bad", "action":"UndoRedo", "payload": e}
                            }),
                        ),
                    }
                }
                None => {
                    let _ = client.send(Message::text(
                        json!({"Info": {"status": "bad", "action":"UndoRedo", "payload": "no such room"}}).to_string()
                    ));
                }
            }
        }

        BoardMessage::Empty {
            private_id,
            public_id,
            action_type,
        } => {
            match rooms.write().await.get_mut(&public_id) {
                Some(r) => {
                    // skip if private_key is not valid
                    if r.private_id != private_id {
                        send_to_user(
                            client,
                            json!({
                                "Info": {"status": "bad", "action":"Empty", "payload": "private_id is invalid"}
                            }),
                        );
                        return;
                    }
                    // save changes
                    if action_type == "current" {
                        r.board.empty_current();
                    } else {
                        r.board.empty_undone();
                    }
                    // form EmptyData msg
                    let response = BoardMessage::EmptyData {
                        action_type: (action_type),
                    };
                    let response = serde_json::to_string(&response).unwrap();
                    // send
                    send_all_except_sender(clients, r, user_id, response);
                }
                None => {
                    let _ = client.send(Message::text(
                        json!({"Info" : {"status": "bad", "action":"UndoRedo", "payload": "no such room"}}).to_string()
                    ));
                }
            }
        }

        BoardMessage::SetSize {
            private_id,
            public_id,
            data,
        } => {
            match rooms.write().await.get_mut(&public_id) {
                Some(r) => {
                    // skip if private_key is not valid
                    if r.private_id != private_id {
                        send_to_user(
                            client,
                            json!({
                                "Info": {"status": "bad", "action":"SetSize", "payload": "private_id is invalid"}
                            }),
                        );
                        return;
                    }
                    // update board state
                    r.board.size = data;
                    // form SetSize msg
                    let response = BoardMessage::SizeData { data: (data) };
                    let response = serde_json::to_string(&response).unwrap();
                    // send
                    send_all_except_sender(clients, r, user_id, response);
                }
                None => {
                    let _ = client.send(Message::text(
                        json!({"Info": {"status": "bad", "action": "SetSize", "payload": "no such room"}}).to_string()
                    ));
                }
            }
        }

        BoardMessage::Pull {
            public_id,
            current,
            undone,
        } => match rooms.read().await.get(&public_id) {
            Some(r) => {
                let pull_data = BoardMessage::PullData(r.board.pull(current, undone));
                let _ = client.send(Message::text(serde_json::to_string(&pull_data).unwrap()));
            }
            None => {
                let _ = client.send(Message::text(
                    json!({"Info": {"status": "bad", "action": "Pull", "payload": "no such room"}})
                        .to_string(),
                ));
            }
        },

        _ => {
            let _ = client.send(Message::text(
                json!({ "Info": {"status": "bad", "action":"Unknown", "payload": "no such method"} }).to_string()
            ));
        }
    }
}

fn send_all_except_sender(
    clients: RwLockReadGuard<'_, HashMap<Arc<usize>, UnboundedSender<Message>>>,
    room: &Room,
    sender_id: Arc<usize>,
    mut data: String,
) {
    // send Push msg to all room users except the sender
    room.users.iter().for_each(|u| {
        if u != sender_id {
            let user = clients.get(&u);
            match user {
                Some(user) => {
                    let _ = user.send(Message::text(mem::take(&mut data)));
                }
                None => (),
            };
        }
    });
}

fn send_to_user(user: &UnboundedSender<Message>, msg: impl ToString) {
    let _ = user.send(Message::text(msg.to_string()));
}
