use crate::{
    libs::{
        room::{RoomChannel, RoomMessage, UserMessage},
        state::{BoardSize, Edit, UserId},
    },
    lifecycle::retrive_room_channel,
    AppState, NEXT_USER_ID,
};
use fastwebsockets::{upgrade, FragmentCollectorRead, Frame, OpCode, Payload, WebSocketError};
use log::{debug, warn};
use serde::{Deserialize, Serialize};
use std::sync::{atomic::Ordering, Arc};
use tokio::sync::{
    mpsc::{error::SendError, unbounded_channel},
    oneshot,
};

#[derive(Debug, Deserialize, Serialize, Clone)]
enum BoardMessage {
    SetTitle {
        title: Box<str>,
    },
    UndoRedo {
        action_type: Box<str>,
        action_id: Box<str>,
    },
    Empty {
        action_type: Box<str>,
    },
    Push {
        data: Vec<Edit>,
        silent: bool,
    },
    PushSegment {
        action_type: Box<str>,
        data: Box<str>,
    },
    SetSize {
        data: BoardSize,
    },
    Pull {
        current: Vec<Box<str>>,
        undone: Vec<Box<str>>,
    },
    Auth {
        token: Box<str>,
    },
}

pub async fn handle_client(
    public_id: Box<str>,
    app_state: AppState,
    fut: upgrade::UpgradeFut,
) -> Result<(), WebSocketError> {
    // try to find room in RAM or DB
    // if there is a room, join it
    // otherwise, close the connection
    let room_chan =
        match retrive_room_channel(app_state.pool.get().await, app_state.rooms, public_id).await {
            Ok(c) => c,
            Err(e) => {
                debug!(
                    "attempt to connect to non-existent room with public_id: {}",
                    e
                );
                return Ok(());
            }
        };
    let user_id = Arc::new(NEXT_USER_ID.fetch_add(1, Ordering::Relaxed));
    // handle the connection
    debug!("connected a user with id: {}", *user_id);
    let ws = fut.await?;
    let (rx_s, mut tx_s) = ws.split(tokio::io::split);
    let mut rx_s = FragmentCollectorRead::new(rx_s);
    let (tx_m, mut rx_m) = unbounded_channel();
    let _ = room_chan.send(UserMessage::Join {
        user_id: user_id.clone(),
        chan: tx_m.to_owned(),
    });
    // send messages to ws
    tokio::spawn(async move {
        while let Some(msg) = rx_m.recv().await {
            let payload = Payload::Borrowed(&msg);
            let frame = Frame::text(payload);
            // if we can't send a message there is no point to continue this loop
            if let Err(e) = tx_s.write_frame(frame).await {
                debug!("failed to send a message, closing the connection: {}", e);
                break;
            }
        }
    });
    let mut is_authed = false;

    // read messages from ws
    while let Ok(frame) = rx_s
        .read_frame::<_, WebSocketError>(&mut move |_| async { Ok(()) })
        .await
    {
        match frame.opcode {
            OpCode::Close => break,
            OpCode::Text => {
                match String::from_utf8(frame.payload.to_vec()) {
                    Ok(s) => {
                        let parsed: Result<BoardMessage, _> = serde_json::from_str(&s);
                        match parsed {
                            Ok(p) => {
                                match handle_message(&room_chan, user_id.clone(), &mut is_authed, p)
                                    .await
                                {
                                    Ok(_) => {}
                                    Err(e) => {
                                        // if we can't send a msg, the room was most likely deleted
                                        // So we should disconnect the user
                                        warn!("try to send to non-existent room: {}", e);
                                        break;
                                    }
                                }
                            }
                            Err(err) => {
                                let msg = RoomMessage::Info {
                                    status: "bad",
                                    action: "unknown",
                                    payload: "cannot parse the message",
                                };
                                warn!("cannot parse message as BoardMessage: {}", err);
                                let _ = tx_m.send(msg.as_bytes());
                            }
                        }
                    }
                    Err(err) => {
                        let msg = RoomMessage::Info {
                            status: "bad",
                            action: "unknown",
                            payload: "message is not utf8 string",
                        };
                        warn!("cannot decode message as utf8 string: {}", err);
                        let _ = tx_m.send(msg.as_bytes());
                    }
                };
            }
            _ => {}
        }
    }

    // drop user_id after disconnect to automatically remove user from room
    debug!("disconnect user with id: {}", *user_id);
    drop(user_id);
    Ok(())
}

async fn handle_message(
    r: &RoomChannel,
    user_id: UserId,
    is_authed: &mut bool,
    msg: BoardMessage,
) -> Result<(), SendError<UserMessage>> {
    match msg {
        BoardMessage::Auth { token } => {
            let (sender, receiver) = oneshot::channel();
            let _ = r.send(UserMessage::Auth {
                user_id,
                token,
                sender,
            });
            if let Ok(r) = receiver.await {
                *is_authed = r;
            }
            Ok(())
        }
        BoardMessage::SetTitle { title } => {
            if *is_authed {
                let _ = r.send(UserMessage::SetTitle { user_id, title });
            }
            Ok(())
        }

        BoardMessage::Push { data, silent } => {
            if *is_authed {
                let _ = r.send(UserMessage::Push {
                    user_id,
                    data,
                    silent,
                });
            }
            Ok(())
        }
        BoardMessage::PushSegment {
            action_type: _,
            data: _,
        } => {
            Ok(())
            // TODO: This part is currently disabled due to the ineffective way used to send websocket messages.
            // Uncomment this, when or if it is improved
            //
            //match rooms.read().await.get(&public_id) {
            //    Some(r) => {
            //        let _ = r.send(UserMessage::PushSegment {
            //            user_id,
            //            private_id,
            //            action_type,
            //            data,
            //        });
            //    }
            //    None => {
            //        //send_to_user_by_id(ws_users, &user_id, &no_such_room("PushSegment")).await;
            //    }
            //}
        }

        BoardMessage::UndoRedo {
            action_type,
            action_id,
        } => {
            if *is_authed {
                let _ = r.send(UserMessage::UndoRedo {
                    user_id,
                    action_type,
                    action_id,
                });
            }
            Ok(())
        }
        BoardMessage::Empty { action_type } => {
            if *is_authed {
                let _ = r.send(UserMessage::Empty {
                    user_id,
                    action_type,
                });
            }
            Ok(())
        }

        BoardMessage::SetSize { data } => {
            if *is_authed {
                let _ = r.send(UserMessage::SetSize { user_id, data });
            }
            Ok(())
        }

        BoardMessage::Pull { current, undone } => r.send(UserMessage::Pull {
            user_id,
            current,
            undone,
        }),
    }
}
