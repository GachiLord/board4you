use crate::entities::board::{delete, save};

use super::state::{
    BoardSize, Command, CommandName, DbClient, Edit, PullData, Room, UserId, WSUsers,
};
use serde::Serialize;
use std::{mem, sync::Arc};
use tokio::sync::{
    mpsc::{UnboundedReceiver, UnboundedSender},
    oneshot,
};
use warp::filters::ws::Message;

pub enum UserMessage {
    Join(UserId),
    Quit(UserId),
    SetTitle {
        user_id: UserId,
        private_id: String,
        title: String,
    },
    UndoRedo {
        user_id: UserId,
        private_id: String,
        action_type: String,
        action_id: String,
    },
    Empty {
        user_id: UserId,
        private_id: String,
        action_type: String,
    },
    Push {
        user_id: UserId,
        private_id: String,
        data: Vec<Edit>,
        silent: bool,
    },
    PushSegment {
        user_id: UserId,
        private_id: String,
        action_type: String,
        data: String,
    },
    SetSize {
        user_id: UserId,
        private_id: String,
        data: BoardSize,
    },
    Pull {
        user_id: UserId,
        current: Vec<String>,
        undone: Vec<String>,
    },
    UpdateCoEditor {
        user_id: UserId,
        private_id: String,
    },
    GetCoEditorToken {
        private_id: String,
        sender: oneshot::Sender<Result<String, ()>>,
    },
    GetUpdatedCoEditorToken {
        private_id: String,
        sender: oneshot::Sender<Result<String, ()>>,
    },
    VerifyCoEditorToken {
        token: String,
        sender: oneshot::Sender<bool>,
    },
    HasUsers(oneshot::Sender<bool>, bool),
    DeleteRoom {
        deleted: oneshot::Sender<bool>,
        private_id: String,
    },
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
}

pub async fn task(
    public_id: String,
    mut room: Room,
    ws_users: &WSUsers,
    db_client: &DbClient,
    mut message_receiver: UnboundedReceiver<UserMessage>,
) {
    // handle room events
    while let Some(msg) = message_receiver.recv().await {
        match msg {
            UserMessage::Join(id) => {
                let ws_users = ws_users.read().await;
                if let Some(user) = ws_users.get(&id) {
                    send_to_user(
                        user,
                        &RoomMessage::Info {
                            status: "ok",
                            action: "Join",
                            payload: "joined",
                        },
                    );
                    send_to_user(
                        user,
                        &RoomMessage::SizeData {
                            data: room.board.size,
                        },
                    );
                    send_to_user(
                        user,
                        &RoomMessage::TitleData {
                            title: &room.board.title,
                        },
                    );
                }
                room.add_user(id);
            }
            UserMessage::Quit(id) => {
                send_to_user_by_id(
                    ws_users,
                    &id,
                    &RoomMessage::Info {
                        status: "ok",
                        action: "Quit",
                        payload: "disconnected from the room",
                    },
                )
                .await;
                room.remove_user(id);
            }
            UserMessage::SetTitle {
                user_id,
                private_id,
                title,
            } => {
                // skip if private_key is not valid
                if room.private_id != private_id && room.board.co_editor_private_id != private_id {
                    send_to_user_by_id(
                        ws_users,
                        &user_id,
                        &RoomMessage::Info {
                            status: "bad",
                            action: "SetTitle",
                            payload: "private_id is invalid",
                        },
                    )
                    .await;
                    continue;
                }
                if title.len() > 36 {
                    send_to_user_by_id(
                        ws_users,
                        &user_id,
                        &RoomMessage::Info {
                            status: "bad",
                            action: "SetTitle",
                            payload: "title is too long",
                        },
                    )
                    .await;
                    continue;
                }
                // changes
                room.board.title = title.clone();
                let title_msg = RoomMessage::TitleData { title: &title };
                // send changes
                send_all_except_sender(ws_users, &room, Some(&user_id), &title_msg).await;
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
                private_id,
                mut data,
                silent,
            } => {
                // skip if private_key is not valid
                if room.private_id != private_id && room.board.co_editor_private_id != private_id {
                    send_to_user_by_id(
                        ws_users,
                        &user_id,
                        &RoomMessage::Info {
                            status: "bad",
                            action: "Push",
                            payload: "private_id is invalid",
                        },
                    )
                    .await;
                    continue;
                }
                // save changes and validate data
                if silent {
                    for edit in data.into_iter() {
                        match room.board.push(edit) {
                            Ok(()) => (),
                            Err(e) => {
                                send_to_user_by_id(
                                    ws_users,
                                    &user_id,
                                    &RoomMessage::Info {
                                        status: "bad",
                                        action: "Push",
                                        payload: &e.to_string(),
                                    },
                                )
                                .await
                            }
                        }
                    }
                } else {
                    for edit in data.to_owned().into_iter() {
                        match room.board.push(edit) {
                            Ok(()) => (),
                            Err(e) => {
                                send_to_user_by_id(
                                    ws_users,
                                    &user_id,
                                    &RoomMessage::Info {
                                        status: "bad",
                                        action: "Push",
                                        payload: &e.to_string(),
                                    },
                                )
                                .await
                            }
                        }
                    }
                    // form data
                    let push_data = RoomMessage::PushData {
                        action: "Push",
                        data: mem::take(&mut data),
                    };
                    // send
                    send_all_except_sender(ws_users, &room, Some(&user_id), &push_data).await;
                }
            }
            UserMessage::PushSegment {
                user_id,
                private_id,
                action_type,
                data,
            } => {
                // skip if private_key is not valid
                if room.private_id != private_id && room.board.co_editor_private_id != private_id {
                    send_to_user_by_id(
                        ws_users,
                        &user_id,
                        &RoomMessage::Info {
                            status: "bad",
                            action: "PushSegment",
                            payload: "private_id is invalid",
                        },
                    )
                    .await;
                    continue;
                }
                // send
                send_all_except_sender(
                    ws_users,
                    &room,
                    Some(&user_id),
                    &RoomMessage::PushSegmentData {
                        action_type: &action_type,
                        data: &data,
                    },
                )
                .await;
            }
            UserMessage::UndoRedo {
                user_id,
                private_id,
                action_type,
                action_id,
            } => {
                // skip if private_key is not valid
                if room.private_id != private_id && room.board.co_editor_private_id != private_id {
                    send_to_user_by_id(
                        ws_users,
                        &user_id,
                        &RoomMessage::Info {
                            status: "bad",
                            action: "UndoRedo",
                            payload: "private_id is invalid",
                        },
                    )
                    .await;
                    continue;
                }
                // determine command name
                let command_name = if action_type == "Undo" {
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
                        send_all_except_sender(
                            ws_users,
                            &room,
                            Some(&user_id),
                            &RoomMessage::UndoRedoData {
                                action_type: &action_type,
                                action_id: &action_id,
                            },
                        )
                        .await;
                    }
                    Err(e) => {
                        send_to_user_by_id(
                            ws_users,
                            &user_id,
                            &RoomMessage::Info {
                                status: "bad",
                                action: "UndoRedo",
                                payload: e,
                            },
                        )
                        .await
                    }
                }
            }
            UserMessage::Empty {
                user_id,
                private_id,
                action_type,
            } => {
                // skip if private_key is not valid
                if room.private_id != private_id && room.board.co_editor_private_id != private_id {
                    send_to_user_by_id(
                        ws_users,
                        &user_id,
                        &RoomMessage::Info {
                            status: "bad",
                            action: "Empty",
                            payload: "private_id is invalid",
                        },
                    )
                    .await;
                    continue;
                }
                // save changes
                if action_type == "current" {
                    room.board.empty_current();
                } else {
                    room.board.empty_undone();
                }
                // send
                send_all_except_sender(
                    ws_users,
                    &room,
                    Some(&user_id),
                    &RoomMessage::EmptyData {
                        action_type: &action_type,
                    },
                )
                .await;
            }
            UserMessage::SetSize {
                user_id,
                private_id,
                data,
            } => {
                // skip if private_key is not valid
                if room.private_id != private_id && room.board.co_editor_private_id != private_id {
                    send_to_user_by_id(
                        ws_users,
                        &user_id,
                        &RoomMessage::Info {
                            status: "bad",
                            action: "SetSize",
                            payload: "private_id is invalid",
                        },
                    )
                    .await;
                    continue;
                }
                // update board state
                if let Err(e) = room.board.set_size(data.height, data.width) {
                    // if size is invalid do nothing
                    send_to_user_by_id(
                        ws_users,
                        &user_id,
                        &RoomMessage::Info {
                            status: "bad",
                            action: "SetSize",
                            payload: e.to_string().as_str(),
                        },
                    )
                    .await;
                    continue;
                }
                send_all_except_sender(
                    ws_users,
                    &room,
                    Some(&user_id),
                    &RoomMessage::SizeData { data },
                )
                .await;
            }
            UserMessage::UpdateCoEditor {
                user_id,
                private_id,
            } => {
                // skip if private_key is not valid
                if room.private_id != private_id && room.board.co_editor_private_id != private_id {
                    send_to_user_by_id(
                        ws_users,
                        &user_id,
                        &RoomMessage::Info {
                            status: "bad",
                            action: "UpdateCoEditor",
                            payload: "private_id is invalid",
                        },
                    )
                    .await;
                    continue;
                }
                // update co-editor token
                room.update_editor_private_id();
                // send message
                send_all_except_sender(
                    ws_users,
                    &room,
                    Some(&user_id),
                    &RoomMessage::UpdateCoEditorData { payload: "updated" },
                )
                .await
            }
            UserMessage::GetUpdatedCoEditorToken { private_id, sender } => {
                if room.private_id != private_id && room.board.co_editor_private_id != private_id {
                    let _ = sender.send(Err(()));
                    continue;
                }
                // update co-editor token
                let _ = sender.send(Ok(room.update_editor_private_id()));
                // send message
                send_all_except_sender(
                    ws_users,
                    &room,
                    None,
                    &RoomMessage::UpdateCoEditorData { payload: "updated" },
                )
                .await
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
            } => {
                let pull_data = RoomMessage::PullData(room.board.pull(current, undone));
                send_to_user_by_id(ws_users, &user_id, &pull_data).await;
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
                    send_all_except_sender(
                        ws_users,
                        &room,
                        None,
                        &RoomMessage::QuitData { payload: "deleted" },
                    )
                    .await;
                    let _ = delete(db_client, &public_id, &private_id);
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

pub async fn send_all_except_sender(
    ws_users: &WSUsers,
    room: &Room,
    sender_id: Option<&UserId>,
    msg: &RoomMessage<'_>,
) {
    let sender_is_none = sender_id.is_none();
    let default_id = Arc::new(0);
    let sender_id = sender_id.unwrap_or(&default_id);
    let ws_users = ws_users.read().await;
    room.users.iter().for_each(|u| {
        if sender_is_none || &u != sender_id {
            let user = ws_users.get(&u);
            match user {
                Some(user) => send_to_user(user, &msg),
                None => (),
            };
        }
    });
}

pub fn send_to_user(user: &UnboundedSender<Message>, msg: &RoomMessage) {
    let _ = user.send(Message::text(serde_json::to_string(&msg).unwrap()));
}

pub async fn send_to_user_by_id(ws_users: &WSUsers, user_id: &UserId, msg: &RoomMessage<'_>) {
    let ws_users = ws_users.read().await;
    match ws_users.get(user_id) {
        Some(user) => send_to_user(user, &msg),
        None => (),
    };
}
