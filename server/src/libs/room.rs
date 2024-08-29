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
use log::debug;
use protocol::{
    board_protocol::{
        server_message::Msg, ActionType, Authed, BoardSize, Edit, EmptyActionType, EmptyData, Info,
        PushData, QuitData, ServerMessage, SizeData, TitleData, UndoRedoData, UpdateCoEditorData,
    },
    encode_server_msg,
};
use std::mem;
use tokio::sync::{
    mpsc::{Receiver, Sender, UnboundedSender},
    oneshot,
};
use uuid::Uuid;

pub type UserChannel = UnboundedSender<Bytes>;
pub type RoomChannel = Sender<UserMessage>;

pub enum UserMessage {
    // Messages that don't require any auth
    Join {
        user_id: usize,
        chan: UserChannel,
    },
    Quit {
        user_id: usize,
    },
    Pull {
        user_id: usize,
        current: Vec<Box<str>>,
        undone: Vec<Box<str>>,
    },
    // Messages that assume user is authed
    SetTitle {
        user_id: usize,
        title: Box<str>,
    },
    UndoRedo {
        user_id: usize,
        action_type: ActionType,
        action_id: Box<str>,
    },
    Empty {
        user_id: usize,
        action_type: EmptyActionType,
    },
    Push {
        user_id: usize,
        data: Vec<Edit>,
        silent: bool,
    },
    SetSize {
        user_id: usize,
        data: Option<BoardSize>,
    },
    // Messages that implement auth
    Auth {
        user_id: usize,
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
    TryExpireCache,
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
    mut message_receiver: Receiver<UserMessage>,
) {
    // handle room events
    'MessageLoop: while let Some(msg) = message_receiver.recv().await {
        match msg {
            UserMessage::Auth {
                token,
                user_id,
                sender,
            } => {
                if token.as_ref() == room.private_id()
                    || token.as_ref() == room.co_editor_private_id()
                {
                    if let Ok(_) = sender.send(true) {
                        send_by_id(
                            &room,
                            user_id,
                            ServerMessage {
                                msg: Some(Msg::Authed(Authed {})),
                            },
                        );
                    }
                } else {
                    let _ = sender.send(false);
                    send_by_id(
                        &room,
                        user_id,
                        ServerMessage {
                            msg: Some(Msg::Info(Info {
                                status: "bad".to_owned(),
                                action: "Auth".to_owned(),
                                payload: "token is invalid".to_owned(),
                            })),
                        },
                    );
                }
            }
            UserMessage::Join { user_id, chan } => {
                room.add_user(user_id.clone(), chan);
                send_by_id(
                    &room,
                    user_id,
                    ServerMessage {
                        msg: Some(Msg::SizeData(SizeData {
                            data: Some(room.size().clone()),
                        })),
                    },
                );
            }
            UserMessage::Quit { user_id } => {
                room.remove_user(&user_id);
            }

            UserMessage::SetTitle { user_id, title } => {
                if title.len() > 36 {
                    send_by_id(
                        &room,
                        user_id,
                        ServerMessage {
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
                room.set_title(title.clone());
                // update title in db
                let (tx, rx) = oneshot::channel();
                db_queue
                    .update_board
                    .send(BoardUpdateChunk {
                        title: room.title().into(),
                        size: room.size().clone(),
                        public_id: room.public_id(),
                        ready: tx,
                    })
                    .await
                    .unwrap();
                rx.await.unwrap();
                // send changes
                send_to_everyone(
                    &room,
                    Some(user_id),
                    ServerMessage {
                        msg: Some(Msg::TitleData(TitleData {
                            title: title.into(),
                        })),
                    },
                );
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
                                    user_id,
                                    ServerMessage {
                                        msg: Some(Msg::Info(Info {
                                            status: "bad".to_owned(),
                                            action: "Push".to_owned(),
                                            payload: e.to_string(),
                                        })),
                                    },
                                );
                                continue 'MessageLoop;
                            }
                        }
                    }
                } else {
                    for edit in data.to_owned().into_iter() {
                        match room.board.push(edit).await {
                            Ok(()) => (),
                            Err(e) => {
                                debug!("failed");
                                send_by_id(
                                    &room,
                                    user_id,
                                    ServerMessage {
                                        msg: Some(Msg::Info(Info {
                                            status: "bad".to_owned(),
                                            action: "Push".to_owned(),
                                            payload: e.to_string(),
                                        })),
                                    },
                                );
                                continue 'MessageLoop;
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
                    send_to_everyone(&room, Some(user_id), push_data);
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
                    Ok(()) => send_to_everyone(
                        &room,
                        Some(user_id),
                        ServerMessage {
                            msg: Some(Msg::UndoRedoData(UndoRedoData {
                                action_type: action_type.into(),
                                action_id: action_id.into(),
                            })),
                        },
                    ),
                    Err(e) => send_by_id(
                        &room,
                        user_id,
                        ServerMessage {
                            msg: Some(Msg::Info(Info {
                                status: "bad".to_owned(),
                                action: "UndoRedo".to_owned(),
                                payload: e.to_owned(),
                            })),
                        },
                    ),
                }
            }
            UserMessage::Empty {
                user_id,
                action_type,
            } => {
                // save changes
                match action_type {
                    EmptyActionType::Current => room.board.empty_current().await,
                    EmptyActionType::Undone => room.board.empty_undone().await,
                }
                // send
                send_to_everyone(
                    &room,
                    Some(user_id),
                    ServerMessage {
                        msg: Some(Msg::EmptyData(EmptyData {
                            action_type: action_type.into(),
                        })),
                    },
                );
            }
            UserMessage::SetSize { user_id, data } => {
                // update board state
                if data.is_none() {
                    send_by_id(
                        &room,
                        user_id,
                        ServerMessage {
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

                    send_by_id(
                        &room,
                        user_id,
                        ServerMessage {
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
                    Some(user_id),
                    ServerMessage {
                        msg: Some(Msg::SizeData(SizeData { data })),
                    },
                );
            }
            UserMessage::GetUpdatedCoEditorToken { private_id, sender } => {
                if room.private_id() != private_id.as_ref()
                    && room.co_editor_private_id() != private_id.as_ref()
                {
                    let _ = sender.send(Err(()));
                    continue;
                }
                // update co-editor token
                let _ = sender.send(Ok(room.update_editor_private_id().await));
                // send message
                send_to_everyone(
                    &room,
                    None,
                    ServerMessage {
                        msg: Some(Msg::UpdateCoEditorData(UpdateCoEditorData {})),
                    },
                );
            }
            UserMessage::GetCoEditorToken { private_id, sender } => {
                if room.private_id() == private_id.as_ref() {
                    let _ = sender.send(Ok(room.co_editor_private_id().into()));
                } else {
                    let _ = sender.send(Err(()));
                }
            }
            UserMessage::VerifyCoEditorToken { token, sender } => {
                let _ = sender.send(room.co_editor_private_id() == token.as_ref());
            }

            UserMessage::Pull {
                user_id,
                current,
                undone,
            } => {
                let r = room.board.pull(current, undone).await;
                let pull_data = ServerMessage {
                    msg: Some(Msg::PullData(r)),
                };
                send_by_id(&room, user_id, pull_data);
            }
            UserMessage::HasUsers(sender) => {
                // if room has no users, stop task execution
                let users_count = room.users().len();
                if users_count == 0 {
                    let (tx, rx) = oneshot::channel();
                    db_queue
                        .update_board
                        .send(BoardUpdateChunk {
                            title: room.title().into(),
                            size: room.size().clone(),
                            public_id: room.public_id(),
                            ready: tx,
                        })
                        .await
                        .unwrap();
                    let _ = rx.await;
                    let _ =
                        sync_with_queue(db_queue, room.public_id(), room.board.op_queue()).await;
                    let _ = sender.send(users_count > 0);
                    break;
                }
                let _ = sender.send(users_count > 0);
            }
            UserMessage::DeleteRoom {
                private_id,
                deleted,
            } => {
                if room.private_id() == private_id.as_ref() {
                    // kick users from the room
                    send_to_everyone(
                        &room,
                        None,
                        ServerMessage {
                            msg: Some(Msg::QuitData(QuitData {})),
                        },
                    );

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
                        title: room.title().into(),
                        size: room.size().clone(),
                        public_id: room.public_id(),
                        ready: tx,
                    })
                    .await
                    .unwrap();
                let _ = rx.await;
                let _ = sync_with_queue(db_queue, room.public_id(), room.board.op_queue()).await;
                let _ = completed.send(());
                break;
            }
            UserMessage::TryExpireCache => {
                room.board.clear_db_cache();
            }
        }
    }
}

pub fn send_to_everyone(room: &Room, except: Option<usize>, msg: ServerMessage) {
    let msg = msg.as_bytes();

    room.users().iter().for_each(|(id, chan)| match except {
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

pub fn send_by_id(room: &Room, id: usize, msg: ServerMessage) {
    let msg = msg.as_bytes();

    if let Some(chan) = room.users().get(&id) {
        let _ = chan.send(msg);
    }
}
