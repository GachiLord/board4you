use crate::entities::board::{delete, save};

use super::state::{BoardSize, Command, CommandName, DbClient, Edit, PullData, Room};
use axum::body::Bytes;
use serde::Serialize;
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
        action_type: Box<str>,
        action_id: Box<str>,
    },
    Empty {
        user_id: Arc<usize>,
        action_type: Box<str>,
    },
    Push {
        user_id: Arc<usize>,
        data: Vec<Edit>,
        silent: bool,
    },
    PushSegment {
        user_id: Arc<usize>,
        action_type: Box<str>,
        data: Box<str>,
    },
    SetSize {
        user_id: Arc<usize>,
        data: BoardSize,
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

#[derive(Serialize)]
pub enum RoomMessage<'a> {
    PushData {
        action: &'a str,
        data: Vec<Edit>,
    },
    PushSegmentData {
        action_type: &'a str,
        data: &'a str,
    },
    UndoRedoData {
        action_type: &'a str,
        action_id: &'a str,
    },
    EmptyData {
        action_type: &'a str,
    },
    SizeData {
        data: BoardSize,
    },
    TitleData {
        title: &'a str,
    },
    QuitData {
        payload: &'a str,
    },
    UpdateCoEditorData {
        payload: &'a str,
    },
    PullData(PullData),
    Info {
        status: &'a str,
        action: &'a str,
        payload: &'a str,
    },
    Authed,
}

impl RoomMessage<'_> {
    pub fn as_bytes(&self) -> Bytes {
        let msg = serde_json::to_string(&self).unwrap();
        return Bytes::from(msg);
    }
}

pub async fn task(
    public_id: Box<str>,
    mut room: Room,
    db_client: DbClient<'_>,
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
                        send_by_id(&room, *user_id, &RoomMessage::Authed);
                    }
                } else {
                    let _ = sender.send(false);
                    send_by_id(
                        &room,
                        *user_id,
                        &RoomMessage::Info {
                            status: "bad",
                            action: "Auth",
                            payload: "token is invalid",
                        },
                    );
                }
            }
            UserMessage::Join { user_id, chan } => {
                room.add_user(user_id, chan);
            }
            UserMessage::SetTitle { user_id, title } => {
                if title.len() > 36 {
                    send_by_id(
                        &room,
                        *user_id,
                        &RoomMessage::Info {
                            status: "bad",
                            action: "SetTitle",
                            payload: "title is too long",
                        },
                    );
                    continue;
                }
                // changes
                room.board.title = title.clone();
                // send changes
                send_to_everyone(
                    &room,
                    Some(*user_id),
                    &RoomMessage::TitleData { title: &title },
                );
                // update title in db
                let _ = db_client
                    .execute(
                        "UPDATE boards SET title = ($1) WHERE public_id = ($2)",
                        &[&title, &public_id],
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
                        match room.board.push(edit) {
                            Ok(()) => (),
                            // FIX: id should send only to sender
                            Err(e) => send_to_everyone(
                                &room,
                                Some(*user_id),
                                &RoomMessage::Info {
                                    status: "bad",
                                    action: "Push",
                                    payload: &e.to_string(),
                                },
                            ),
                        }
                    }
                } else {
                    for edit in data.to_owned().into_iter() {
                        match room.board.push(edit) {
                            Ok(()) => (),
                            // FIX: id should send to user_id
                            Err(e) => send_to_everyone(
                                &room,
                                Some(*user_id),
                                &RoomMessage::Info {
                                    status: "bad",
                                    action: "Push",
                                    payload: &e.to_string(),
                                },
                            ),
                        }
                    }
                    // form data
                    let push_data = RoomMessage::PushData {
                        action: "Push",
                        data: mem::take(&mut data),
                    };
                    // send
                    send_to_everyone(&room, Some(*user_id), &push_data);
                }
            }
            UserMessage::PushSegment {
                user_id,
                action_type,
                data,
            } => {
                // send
                send_to_everyone(
                    &room,
                    Some(*user_id),
                    &RoomMessage::PushSegmentData {
                        action_type: &action_type,
                        data: &data,
                    },
                )
            }
            UserMessage::UndoRedo {
                user_id,
                action_type,
                action_id,
            } => {
                // determine command name
                let command_name = if action_type.as_ref() == "Undo" {
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
                    Ok(()) => send_to_everyone(
                        &room,
                        Some(*user_id),
                        &RoomMessage::UndoRedoData {
                            action_type: &action_type,
                            action_id: &action_id,
                        },
                    ),
                    Err(e) => send_by_id(
                        &room,
                        *user_id,
                        &RoomMessage::Info {
                            status: "bad",
                            action: "UndoRedo",
                            payload: e,
                        },
                    ),
                }
            }
            UserMessage::Empty {
                user_id,
                action_type,
            } => {
                // save changes
                if action_type.as_ref() == "current" {
                    room.board.empty_current();
                } else {
                    room.board.empty_undone();
                }
                // send
                send_to_everyone(
                    &room,
                    Some(*user_id),
                    &RoomMessage::EmptyData {
                        action_type: &action_type,
                    },
                )
            }
            UserMessage::SetSize { user_id, data } => {
                // update board state
                if let Err(e) = room.board.set_size(data.height, data.width) {
                    // if size is invalid do nothing
                    send_by_id(
                        &room,
                        *user_id,
                        &RoomMessage::Info {
                            status: "bad",
                            action: "SetSize",
                            payload: e.to_string().as_str(),
                        },
                    );
                    continue;
                }
                send_to_everyone(&room, Some(*user_id), &RoomMessage::SizeData { data });
            }
            UserMessage::UpdateCoEditor {
                user_id,
                private_id,
            } => {
                // skip if private_key is not valid
                if room.private_id != private_id && room.board.co_editor_private_id != private_id {
                    send_by_id(
                        &room,
                        *user_id,
                        &RoomMessage::Info {
                            status: "bad",
                            action: "UpdateCoEditor",
                            payload: "private_id is invalid",
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
                    &RoomMessage::UpdateCoEditorData { payload: "updated" },
                )
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
                    &RoomMessage::UpdateCoEditorData { payload: "updated" },
                )
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
                let pull_data = RoomMessage::PullData(room.board.pull(current, undone));
                send_by_id(&room, *user_id, &pull_data);
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
                    send_to_everyone(&room, None, &RoomMessage::QuitData { payload: "deleted" });
                    let _ = delete(&db_client, &public_id, &private_id);
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

pub fn send_to_everyone(room: &Room, except: Option<usize>, msg: &RoomMessage) {
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

pub fn send_by_id(room: &Room, id: usize, msg: &RoomMessage) {
    let msg = msg.as_bytes();

    if let Some(chan) = room.users.get(&id) {
        let _ = chan.send(msg);
    }
}
