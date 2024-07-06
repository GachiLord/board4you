use crate::entities::board::{delete, save};

use super::state::{Command, CommandName, DbClient, Room};
use axum::body::Bytes;
use log::debug;
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
    UpdateCoEditor {
        user_id: Arc<usize>,
        private_id: Box<str>,
    },
    GetCoEditorToken {
        private_id: Box<str>,
        sender: oneshot::Sender<Result<Box<str>, ()>>,
    },
    GetUpdatedCoEditorToken {
        private_id: Box<str>,
        sender: oneshot::Sender<Result<Box<str>, ()>>,
    },
    VerifyEditorToken {
        token: Box<str>,
        sender: oneshot::Sender<bool>,
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
    HasUsers(oneshot::Sender<bool>, bool),
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
    public_id: Box<str>,
    mut room: Room,
    db_client: DbClient<'_>,
    mut message_receiver: UnboundedReceiver<UserMessage>,
) {
    debug!("start task");
    // handle room events
    while let Some(msg) = message_receiver.recv().await {
        debug!("start msg loop");
        match msg {
            UserMessage::Auth {
                token,
                user_id,
                sender,
            } => {
                debug!("start auth process");
                if token == room.private_id || token == room.board.co_editor_private_id {
                    debug!("Start sending auth result");
                    if let Ok(_) = sender.send(true) {
                        send_by_id(
                            &room,
                            *user_id,
                            &ServerMessage {
                                msg: Some(Msg::Authed(Authed {})),
                            },
                        );
                        debug!("Auth message sent");
                    } else {
                        debug!("Failed to send auth result");
                    }
                } else {
                    let _ = sender.send(false);
                    send_by_id(
                        &room,
                        *user_id,
                        &ServerMessage {
                            msg: Some(Msg::Info(Info {
                                status: "bad".to_owned(),
                                action: "Auth".to_owned(),
                                payload: "token is invalid".to_owned(),
                            })),
                        },
                    );
                    debug!("Auth Info message sent");
                }
            }
            UserMessage::Join { user_id, chan } => {
                room.add_user(user_id, chan);
            }
            UserMessage::SetTitle { user_id, title } => {
                if title.len() > 36 {
                    debug!("SetTitle Info message sent");
                    send_by_id(
                        &room,
                        *user_id,
                        &ServerMessage {
                            msg: Some(Msg::Info(Info {
                                status: "bad".to_owned(),
                                action: "SetTitle".to_owned(),
                                payload: "title is too long".to_owned(),
                            })),
                        },
                    );
                    continue;
                }
                // changes
                room.board.title = title.clone();
                // update title in db
                let _ = db_client
                    .execute(
                        "UPDATE boards SET title = ($1) WHERE public_id = ($2)",
                        &[&title, &public_id],
                    )
                    .await;
                // send changes
                send_to_everyone(
                    &room,
                    Some(*user_id),
                    &ServerMessage {
                        msg: Some(Msg::TitleData(TitleData {
                            title: title.into(),
                        })),
                    },
                );
                debug!("TitleData message sent");
            }
            UserMessage::Push {
                user_id,
                mut data,
                silent,
            } => {
                // save changes and validate data
                if silent {
                    for edit in data.into_iter() {
                        match room.board.push(edit) {
                            Ok(()) => (),
                            Err(e) => {
                                debug!("Push Info message sent");
                                send_by_id(
                                    &room,
                                    *user_id,
                                    &ServerMessage {
                                        msg: Some(Msg::Info(Info {
                                            status: "bad".to_owned(),
                                            action: "Push".to_owned(),
                                            payload: e.to_string(),
                                        })),
                                    },
                                );
                            }
                        }
                    }
                } else {
                    for edit in data.to_owned().into_iter() {
                        match room.board.push(edit) {
                            Ok(()) => (),
                            Err(e) => {
                                debug!("Push Info message sent");
                                send_by_id(
                                    &room,
                                    *user_id,
                                    &ServerMessage {
                                        msg: Some(Msg::Info(Info {
                                            status: "bad".to_owned(),
                                            action: "Push".to_owned(),
                                            payload: e.to_string(),
                                        })),
                                    },
                                );
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
                    send_to_everyone(&room, Some(*user_id), &push_data);
                    debug!("PushData message sent");
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
                let exec_command = room.board.exec_command(Command {
                    name: command_name,
                    id: action_id.clone(),
                });
                // handle command result
                match exec_command {
                    Ok(()) => {
                        debug!("UndoRedoData message sent");
                        send_to_everyone(
                            &room,
                            Some(*user_id),
                            &ServerMessage {
                                msg: Some(Msg::UndoRedoData(UndoRedoData {
                                    action_type: action_type.into(),
                                    action_id: action_id.into(),
                                })),
                            },
                        )
                    }
                    Err(e) => {
                        debug!("UndoRedo Info message sent");
                        send_by_id(
                            &room,
                            *user_id,
                            &ServerMessage {
                                msg: Some(Msg::Info(Info {
                                    status: "bad".to_owned(),
                                    action: "UndoRedo".to_owned(),
                                    payload: e.to_owned(),
                                })),
                            },
                        )
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
                        room.board.empty_current();
                    }
                    EmptyActionType::Undone => {
                        room.board.empty_undone();
                    }
                }
                // send
                send_to_everyone(
                    &room,
                    Some(*user_id),
                    &ServerMessage {
                        msg: Some(Msg::EmptyData(EmptyData {
                            action_type: action_type.into(),
                        })),
                    },
                );
                debug!("Empty message sent");
            }
            UserMessage::SetSize { user_id, data } => {
                // update board state
                if data.is_none() {
                    debug!("SetSize Info message sent");
                    send_by_id(
                        &room,
                        *user_id,
                        &ServerMessage {
                            msg: Some(Msg::Info(Info {
                                status: "bad".to_owned(),
                                action: "SetSize".to_owned(),
                                payload: "size is None".to_owned(),
                            })),
                        },
                    );
                    continue;
                }
                if let Err(e) = room
                    .board
                    .set_size(data.as_ref().unwrap().height, data.as_ref().unwrap().width)
                {
                    // if size is invalid do nothing
                    debug!("SetSize Info message sent");
                    send_by_id(
                        &room,
                        *user_id,
                        &ServerMessage {
                            msg: Some(Msg::Info(Info {
                                status: "bad".to_owned(),
                                action: "SetSize".to_owned(),
                                payload: e.to_string(),
                            })),
                        },
                    );
                    continue;
                }
                send_to_everyone(
                    &room,
                    Some(*user_id),
                    &ServerMessage {
                        msg: Some(Msg::SizeData(SizeData { data })),
                    },
                );
                debug!("SizeData message sent");
            }
            UserMessage::UpdateCoEditor {
                user_id,
                private_id,
            } => {
                // skip if private_key is not valid
                if room.private_id != private_id && room.board.co_editor_private_id != private_id {
                    debug!("UpdateCoEditor Info message sent");
                    send_by_id(
                        &room,
                        *user_id,
                        &ServerMessage {
                            msg: Some(Msg::Info(Info {
                                status: "bad".to_owned(),
                                action: "UpdateCoEditor".to_owned(),
                                payload: "private_id is invalid".to_owned(),
                            })),
                        },
                    );
                    continue;
                }
                // update co-editor token
                room.update_editor_private_id();
                // send message
                send_to_everyone(
                    &room,
                    Some(*user_id),
                    &ServerMessage {
                        msg: Some(Msg::UpdateCoEditorData(UpdateCoEditorData {})),
                    },
                );
                debug!("UpdateCoEditorData message sent");
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
                    &ServerMessage {
                        msg: Some(Msg::UpdateCoEditorData(UpdateCoEditorData {})),
                    },
                );
                debug!("UpdateCoEditorData message sent");
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

            UserMessage::VerifyEditorToken { token, sender } => {
                let _ = sender.send(room.private_id == token);
            }
            UserMessage::Pull {
                user_id,
                current,
                undone,
            } => {
                debug!("Start sending PullData");
                let pull_data = &ServerMessage {
                    msg: Some(Msg::PullData(room.board.pull(current, undone))),
                };
                send_by_id(&room, *user_id, &pull_data);
                debug!("PullData message sent");
            }
            UserMessage::HasUsers(sender, no_persist) => {
                room.users.remove_expired();
                let _ = sender.send(room.users.len() > 0);
                // if room has no users, stop task execution
                if room.users.len() == 0 {
                    if !no_persist {
                        let _ = save(&db_client, &room).await;
                    }
                    break;
                }
            }
            UserMessage::DeleteRoom {
                private_id,
                deleted,
            } => {
                if room.private_id == private_id {
                    // kick users from the room
                    send_to_everyone(
                        &room,
                        None,
                        &ServerMessage {
                            msg: Some(Msg::QuitData(QuitData {})),
                        },
                    );
                    debug!("QuitData message sent");
                    let _ = delete(&db_client, &public_id, &private_id).await;
                    let _ = deleted.send(true);
                } else {
                    let _ = deleted.send(false);
                }
            }
            UserMessage::Expire(completed) => {
                let _ = save(&db_client, &room).await;
                let _ = completed.send(());
                break;
            }
        }
    }
}

pub fn send_to_everyone(room: &Room, except: Option<usize>, msg: &ServerMessage) {
    let msg = msg.as_bytes();

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

pub fn send_by_id(room: &Room, id: usize, msg: &ServerMessage) {
    let msg = msg.as_bytes();

    if let Some(chan) = room.users.get(&id) {
        let _ = chan.send(msg);
    }
}
