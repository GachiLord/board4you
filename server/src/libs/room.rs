use crate::{
    entities::{board::delete, edit::sync_with_queue},
    libs::db_queue::BoardUpdateChunk,
    PoolWrapper,
};

use super::{
    db_queue::DbQueueSender,
    state::{Command, CommandName, Room},
};
use axum::body::Bytes;
use log::{debug, error};
use protocol::{
    board_protocol::{
        server_message::Msg, ActionType, Authed, BoardSize, Edit, EmptyActionType, EmptyData, Info,
        PushData, QuitData, ServerMessage, SizeData, TitleData, UndoRedoData, UpdateCoEditorData,
    },
    encode_server_msg,
};
use std::{mem, sync::Arc};
use tokio::sync::{
    mpsc::{UnboundedReceiver, UnboundedSender},
    oneshot,
};
use uuid::Uuid;

pub type UserChannel = UnboundedSender<Bytes>;
pub type RoomChannel = UnboundedSender<UserMessage>;

pub enum UserMessage {
    // Messages that don't require any auth
    Join {
        user_id: Arc<usize>,
        chan: UserChannel,
    },
    Pull {
        user_id: Arc<usize>,
        current: Vec<Box<str>>,
        undone: Vec<Box<str>>,
    },
    // Messages that assume user is authed
    SetTitle {
        user_id: Arc<usize>,
        title: Box<str>,
    },
    UndoRedo {
        user_id: Arc<usize>,
        action_type: ActionType,
        action_id: Box<str>,
    },
    Empty {
        user_id: Arc<usize>,
        action_type: EmptyActionType,
    },
    Push {
        user_id: Arc<usize>,
        data: Vec<Edit>,
        silent: bool,
    },
    SetSize {
        user_id: Arc<usize>,
        data: Option<BoardSize>,
    },
    // Messages that implement auth
    Auth {
        user_id: Arc<usize>,
        token: Box<str>,
        sender: oneshot::Sender<bool>,
    },
    GetCoEditorToken {
        private_id: Box<str>,
        sender: oneshot::Sender<Result<Box<str>, ()>>,
    },
    GetUpdatedCoEditorToken {
        private_id: Box<str>,
        sender: oneshot::Sender<Result<Box<str>, ()>>,
    },
    VerifyCoEditorToken {
        token: Box<str>,
        sender: oneshot::Sender<bool>,
    },
    DeleteRoom {
        deleted: oneshot::Sender<bool>,
        private_id: Box<str>,
    },
    // Messages that used only by app(user cannot send them)
    HasUsers(oneshot::Sender<bool>),
    Expire(oneshot::Sender<()>),
}

trait ToBytes {
    fn as_bytes(&self) -> Bytes;
}

impl ToBytes for ServerMessage {
    fn as_bytes(&self) -> Bytes {
        let msg = encode_server_msg(self);
        return Bytes::from(msg);
    }
}

pub async fn task(
    public_id: Uuid,
    mut room: Room,
    client_pool: &PoolWrapper,
    db_queue: &DbQueueSender,
    mut message_receiver: UnboundedReceiver<UserMessage>,
) {
    // handle room events
    while let Some(msg) = message_receiver.recv().await {
        match msg {
            UserMessage::Auth {
                token,
                user_id,
                sender,
            } => {
                if token == room.private_id || token == room.board.co_editor_private_id {
                    if let Ok(_) = sender.send(true) {
                        send_by_id(
                            &room,
                            *user_id,
                            ServerMessage {
                                msg: Some(Msg::Authed(Authed {})),
                            },
                        )
                        .await;
                    }
                } else {
                    let _ = sender.send(false);
                    send_by_id(
                        &room,
                        *user_id,
                        ServerMessage {
                            msg: Some(Msg::Info(Info {
                                status: "bad".to_owned(),
                                action: "Auth".to_owned(),
                                payload: "token is invalid".to_owned(),
                            })),
                        },
                    )
                    .await;
                }
            }
            UserMessage::Join { user_id, chan } => {
                room.add_user(user_id.clone(), chan);
                send_by_id(
                    &room,
                    *user_id,
                    ServerMessage {
                        msg: Some(Msg::SizeData(SizeData {
                            data: Some(room.board.size.clone()),
                        })),
                    },
                )
                .await;
            }
            UserMessage::SetTitle { user_id, title } => {
                if title.len() > 36 {
                    send_by_id(
                        &room,
                        *user_id,
                        ServerMessage {
                            msg: Some(Msg::Info(Info {
                                status: "bad".to_owned(),
                                action: "SetTitle".to_owned(),
                                payload: "title is too long".to_owned(),
                            })),
                        },
                    )
                    .await;
                    continue;
                }
                // changes
                room.board.title = title.clone();
                // update title in db
                let (tx, rx) = oneshot::channel();
                db_queue
                    .update_board
                    .send(BoardUpdateChunk {
                        title: room.board.title.clone(),
                        size: room.board.size.clone(),
                        public_id: room.public_id,
                        ready: tx,
                    })
                    .await
                    .unwrap();
                rx.await.unwrap();
                // send changes
                send_to_everyone(
                    &room,
                    Some(*user_id),
                    ServerMessage {
                        msg: Some(Msg::TitleData(TitleData {
                            title: title.into(),
                        })),
                    },
                )
                .await;
            }
            UserMessage::Push {
                user_id,
                mut data,
                silent,
            } => {
                // save changes and validate data
                if silent {
                    for edit in data.into_iter() {
                        match room.board.push(edit).await {
                            Ok(()) => (),
                            Err(e) => {
                                send_by_id(
                                    &room,
                                    *user_id,
                                    ServerMessage {
                                        msg: Some(Msg::Info(Info {
                                            status: "bad".to_owned(),
                                            action: "Push".to_owned(),
                                            payload: e.to_string(),
                                        })),
                                    },
                                )
                                .await;
                            }
                        }
                    }
                } else {
                    for edit in data.to_owned().into_iter() {
                        match room.board.push(edit).await {
                            Ok(()) => (),
                            Err(e) => {
                                send_by_id(
                                    &room,
                                    *user_id,
                                    ServerMessage {
                                        msg: Some(Msg::Info(Info {
                                            status: "bad".to_owned(),
                                            action: "Push".to_owned(),
                                            payload: e.to_string(),
                                        })),
                                    },
                                )
                                .await;
                            }
                        }
                    }
                    // form data
                    let push_data = ServerMessage {
                        msg: Some(Msg::PushData(PushData {
                            data: mem::take(&mut data),
                        })),
                    };
                    // send
                    send_to_everyone(&room, Some(*user_id), push_data).await;
                }
            }
            UserMessage::UndoRedo {
                user_id,
                action_type,
                action_id,
            } => {
                // determine command name
                let command_name = if action_type == ActionType::Undo {
                    CommandName::Undo
                } else {
                    CommandName::Redo
                };
                // save changes
                let exec_command = room
                    .board
                    .exec_command(Command {
                        name: command_name,
                        id: action_id.clone(),
                    })
                    .await;
                // handle command result
                match exec_command {
                    Ok(()) => {
                        send_to_everyone(
                            &room,
                            Some(*user_id),
                            ServerMessage {
                                msg: Some(Msg::UndoRedoData(UndoRedoData {
                                    action_type: action_type.into(),
                                    action_id: action_id.into(),
                                })),
                            },
                        )
                        .await
                    }
                    Err(e) => {
                        send_by_id(
                            &room,
                            *user_id,
                            ServerMessage {
                                msg: Some(Msg::Info(Info {
                                    status: "bad".to_owned(),
                                    action: "UndoRedo".to_owned(),
                                    payload: e.to_owned(),
                                })),
                            },
                        )
                        .await
                    }
                }
            }
            UserMessage::Empty {
                user_id,
                action_type,
            } => {
                // save changes
                match action_type {
                    EmptyActionType::Current => {
                        if let Err(e) = room.board.empty_current().await {
                            error!("Failed to empty current buffer: {}", e);
                        }
                    }
                    EmptyActionType::Undone => {
                        if let Err(e) = room.board.empty_undone().await {
                            error!("Failed to empty undone buffer: {}", e);
                        }
                    }
                }
                // send
                send_to_everyone(
                    &room,
                    Some(*user_id),
                    ServerMessage {
                        msg: Some(Msg::EmptyData(EmptyData {
                            action_type: action_type.into(),
                        })),
                    },
                )
                .await;
            }
            UserMessage::SetSize { user_id, data } => {
                // update board state
                if data.is_none() {
                    send_by_id(
                        &room,
                        *user_id,
                        ServerMessage {
                            msg: Some(Msg::Info(Info {
                                status: "bad".to_owned(),
                                action: "SetSize".to_owned(),
                                payload: "size is None".to_owned(),
                            })),
                        },
                    )
                    .await;
                    continue;
                }
                if let Err(e) = room
                    .board
                    .set_size(data.as_ref().unwrap().height, data.as_ref().unwrap().width)
                {
                    // if size is invalid do nothing

                    send_by_id(
                        &room,
                        *user_id,
                        ServerMessage {
                            msg: Some(Msg::Info(Info {
                                status: "bad".to_owned(),
                                action: "SetSize".to_owned(),
                                payload: e.to_string(),
                            })),
                        },
                    )
                    .await;
                    continue;
                }
                send_to_everyone(
                    &room,
                    Some(*user_id),
                    ServerMessage {
                        msg: Some(Msg::SizeData(SizeData { data })),
                    },
                )
                .await;
            }
            UserMessage::GetUpdatedCoEditorToken { private_id, sender } => {
                if room.private_id != private_id && room.board.co_editor_private_id != private_id {
                    let _ = sender.send(Err(()));
                    continue;
                }
                // update co-editor token
                let _ = sender.send(Ok(room.update_editor_private_id()));
                // send message
                send_to_everyone(
                    &room,
                    None,
                    ServerMessage {
                        msg: Some(Msg::UpdateCoEditorData(UpdateCoEditorData {})),
                    },
                )
                .await;
            }
            UserMessage::GetCoEditorToken { private_id, sender } => {
                if room.private_id == private_id {
                    let _ = sender.send(Ok(room.board.co_editor_private_id.clone()));
                } else {
                    let _ = sender.send(Err(()));
                }
            }
            UserMessage::VerifyCoEditorToken { token, sender } => {
                let _ = sender.send(room.board.co_editor_private_id == token);
            }

            UserMessage::Pull {
                user_id,
                current,
                undone,
            } => match room.board.pull(current, undone).await {
                Ok(r) => {
                    let pull_data = ServerMessage {
                        msg: Some(Msg::PullData(r)),
                    };
                    send_by_id(&room, *user_id, pull_data).await;
                }
                Err(e) => {
                    error!("Failed to pull: {}", e);
                }
            },
            UserMessage::HasUsers(sender) => {
                room.users.remove_expired();
                let _ = sender.send(room.users.len() > 0);
                // if room has no users, stop task execution
                if room.users.len() == 0 {
                    let (tx, rx) = oneshot::channel();
                    db_queue
                        .update_board
                        .send(BoardUpdateChunk {
                            title: room.board.title,
                            size: room.board.size.clone(),
                            public_id: room.board.public_id,
                            ready: tx,
                        })
                        .await
                        .unwrap();
                    let _ = rx.await;
                    let _ = sync_with_queue(db_queue, room.public_id, room.board.queue).await;
                    break;
                }
            }
            UserMessage::DeleteRoom {
                private_id,
                deleted,
            } => {
                if room.private_id == private_id {
                    // kick users from the room
                    // TODO: try wrap in spawn blocking
                    send_to_everyone(
                        &room,
                        None,
                        ServerMessage {
                            msg: Some(Msg::QuitData(QuitData {})),
                        },
                    )
                    .await;

                    let _ = delete(&client_pool.get().await, public_id, &private_id).await;
                    let _ = deleted.send(true);
                } else {
                    let _ = deleted.send(false);
                }
            }
            UserMessage::Expire(completed) => {
                let (tx, rx) = oneshot::channel();
                db_queue
                    .update_board
                    .send(BoardUpdateChunk {
                        title: room.board.title,
                        size: room.board.size.clone(),
                        public_id: room.board.public_id,
                        ready: tx,
                    })
                    .await
                    .unwrap();
                let _ = rx.await;
                let _ = sync_with_queue(db_queue, room.public_id, room.board.queue).await;
                let _ = completed.send(());
                break;
            }
        }
    }
}

pub async fn send_to_everyone(room: &Room, except: Option<usize>, msg: ServerMessage) {
    let (tx, rx) = oneshot::channel();
    tokio::task::spawn_blocking(move || {
        let msg = msg.as_bytes();
        tx.send(msg).unwrap();
    });
    let msg = rx.await.unwrap();

    room.users.iter().for_each(|(id, chan)| match except {
        Some(except) => {
            if except != *id {
                let _ = chan.send(msg.clone());
            }
        }
        None => {
            let _ = chan.send(msg.clone());
        }
    });
}

pub async fn send_by_id(room: &Room, id: usize, msg: ServerMessage) {
    let (tx, rx) = oneshot::channel();
    tokio::task::spawn_blocking(move || {
        let msg = msg.as_bytes();
        tx.send(msg).unwrap();
    });
    let msg = rx.await.unwrap();

    if let Some(chan) = room.users.get(&id) {
        let _ = chan.send(msg);
    }
}
