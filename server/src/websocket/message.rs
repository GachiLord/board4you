use crate::entities::board;
use crate::libs::room::{self, send_to_user_by_id, RoomMessage, UserMessage};
use crate::libs::state::{BoardSize, Edit, Room};
use crate::libs::state::{Rooms, WSUsers};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::mpsc::unbounded_channel;
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
        data: Vec<Edit>,
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
    UpdateCoEditor {
        public_id: String,
        private_id: String,
    },
}

pub async fn user_message(
    user_id: Arc<usize>,
    msg: Message,
    db_client: &Arc<Client>,
    ws_users: &WSUsers,
    rooms: &Rooms,
) {
    // validate message type
    let msg: BoardMessage = match msg.to_str() {
        Ok(s) => match serde_json::from_str(s) {
            Ok(j) => j,
            Err(e) => {
                send_to_user_by_id(
                    ws_users,
                    &user_id,
                    &RoomMessage::Info {
                        status: "bad",
                        action: "unknown",
                        payload: &e.to_string(),
                    },
                )
                .await;
                return;
            }
        },
        Err(_) => {
            send_to_user_by_id(
                ws_users,
                &user_id,
                &RoomMessage::Info {
                    status: "bad",
                    action: "unknown",
                    payload: "message is not a string",
                },
            )
            .await;
            return;
        }
    };
    // handle all msg variants
    match msg {
        BoardMessage::Join { public_id } => {
            let rooms_p = rooms.read().await;

            match rooms_p.get(&public_id) {
                Some(r) => {
                    // join room if there is an active one
                    let _ = r.send(UserMessage::Join(user_id));
                }
                None => {
                    // drop previous rooms pointer to prevent deadlock
                    drop(rooms_p);
                    // if there is a room in db, spawn it and join
                    match board::get(db_client, &public_id).await {
                        Ok((private_id, board)) => {
                            let room = Room {
                                public_id: public_id.clone(),
                                private_id,
                                board,
                                users: WeakHashSet::with_capacity(10),
                                owner_id: None, // we don't need to provide owner_id here, because
                                                // it had already been saved in db earler during
                                                // last cleanup.
                            };
                            // spawn room_task
                            let (tx, rx) = unbounded_channel();
                            let public_id_c = public_id.clone();
                            let db_client_c = db_client.clone();
                            let ws_users_c = ws_users.clone();
                            tokio::spawn(async move {
                                room::task(public_id_c, room, &ws_users_c, &db_client_c, rx).await;
                            });
                            // send join msg to the room
                            let _ = tx.send(UserMessage::Join(user_id));
                            // add new room
                            let mut rooms_p = rooms.write().await;
                            rooms_p.insert(public_id, tx);
                        }
                        Err(_) => {
                            send_to_user_by_id(ws_users, &user_id, &no_such_room("Join")).await;
                        }
                    }
                }
            }
        }

        BoardMessage::Quit { public_id } => match rooms.read().await.get(&public_id) {
            Some(r) => {
                let _ = r.send(UserMessage::Quit(user_id));
            }
            None => {
                send_to_user_by_id(ws_users, &user_id, &no_such_room("Quit")).await;
            }
        },

        BoardMessage::SetTitle {
            private_id,
            public_id,
            title,
        } => match rooms.read().await.get(&public_id) {
            None => {
                send_to_user_by_id(ws_users, &user_id, &no_such_room("Quit")).await;
            }
            Some(r) => {
                let _ = r.send(UserMessage::SetTitle {
                    user_id,
                    private_id,
                    title,
                });
            }
        },

        BoardMessage::Push {
            public_id,
            private_id,
            data,
            silent,
        } => {
            match rooms.read().await.get(&public_id) {
                Some(r) => {
                    let _ = r.send(UserMessage::Push {
                        user_id,
                        private_id,
                        data,
                        silent,
                    });
                }
                None => {
                    send_to_user_by_id(ws_users, &user_id, &no_such_room("Push")).await;
                }
            };
        }

        BoardMessage::PushSegment {
            public_id,
            private_id,
            action_type,
            data,
        } => match rooms.read().await.get(&public_id) {
            Some(r) => {
                let _ = r.send(UserMessage::PushSegment {
                    user_id,
                    private_id,
                    action_type,
                    data,
                });
            }
            None => {
                send_to_user_by_id(ws_users, &user_id, &no_such_room("PushSegment")).await;
            }
        },

        BoardMessage::UndoRedo {
            private_id,
            public_id,
            action_type,
            action_id,
        } => match rooms.write().await.get_mut(&public_id) {
            Some(r) => {
                let _ = r.send(UserMessage::UndoRedo {
                    user_id,
                    private_id,
                    action_type,
                    action_id,
                });
            }
            None => {
                send_to_user_by_id(ws_users, &user_id, &no_such_room("UndoRedo")).await;
            }
        },

        BoardMessage::Empty {
            private_id,
            public_id,
            action_type,
        } => match rooms.write().await.get_mut(&public_id) {
            Some(r) => {
                let _ = r.send(UserMessage::Empty {
                    user_id,
                    private_id,
                    action_type,
                });
            }
            None => {
                send_to_user_by_id(ws_users, &user_id, &no_such_room("Empty")).await;
            }
        },

        BoardMessage::SetSize {
            private_id,
            public_id,
            data,
        } => match rooms.write().await.get_mut(&public_id) {
            Some(r) => {
                let _ = r.send(UserMessage::SetSize {
                    user_id,
                    private_id,
                    data,
                });
            }
            None => {
                send_to_user_by_id(ws_users, &user_id, &no_such_room("SetSize")).await;
            }
        },

        BoardMessage::UpdateCoEditor {
            public_id,
            private_id,
        } => match rooms.write().await.get_mut(&public_id) {
            Some(room) => {
                let _ = room.send(UserMessage::UpdateCoEditor {
                    user_id,
                    private_id,
                });
            }
            None => send_to_user_by_id(ws_users, &user_id, &no_such_room("UpdateCoEditor")).await,
        },

        BoardMessage::Pull {
            public_id,
            current,
            undone,
        } => match rooms.read().await.get(&public_id) {
            Some(r) => {
                let _ = r.send(UserMessage::Pull {
                    user_id,
                    current,
                    undone,
                });
            }
            None => send_to_user_by_id(ws_users, &user_id, &no_such_room("Pull")).await,
        },
    }
}

fn no_such_room(action: &str) -> RoomMessage {
    RoomMessage::Info {
        status: "bad",
        action,
        payload: "no such room",
    }
}
