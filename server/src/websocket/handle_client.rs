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
use tokio::sync::mpsc::{error::SendError, unbounded_channel};

#[derive(Debug, Deserialize, Serialize, Clone)]
enum BoardMessage {
    SetTitle {
        private_id: Box<str>,
        title: Box<str>,
    },
    UndoRedo {
        private_id: Box<str>,
        action_type: Box<str>,
        action_id: Box<str>,
    },
    Empty {
        private_id: Box<str>,
        action_type: Box<str>,
    },
    Push {
        private_id: Box<str>,
        data: Vec<Edit>,
        silent: bool,
    },
    PushSegment {
        private_id: Box<str>,
        action_type: Box<str>,
        data: Box<str>,
    },
    SetSize {
        private_id: Box<str>,
        data: BoardSize,
    },
    Pull {
        current: Vec<Box<str>>,
        undone: Vec<Box<str>>,
    },
    UpdateCoEditor {
        private_id: Box<str>,
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
    let room_chan = match retrive_room_channel(app_state.client, app_state.rooms, public_id).await {
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
                            Ok(p) => match handle_message(&room_chan, user_id.clone(), p) {
                                Ok(_) => {}
                                Err(e) => {
                                    // if we can't send a msg, the room was most likely deleted
                                    // So we should disconnect user
                                    warn!("try to send to non-existent room: {}", e);
                                    break;
                                }
                            },
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

fn handle_message(
    r: &RoomChannel,
    user_id: UserId,
    msg: BoardMessage,
) -> Result<(), SendError<UserMessage>> {
    match msg {
        BoardMessage::SetTitle { private_id, title } => r.send(UserMessage::SetTitle {
            user_id,
            private_id,
            title,
        }),

        BoardMessage::Push {
            private_id,
            data,
            silent,
        } => r.send(UserMessage::Push {
            user_id,
            private_id,
            data,
            silent,
        }),
        BoardMessage::PushSegment {
            private_id: _,
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
            private_id,
            action_type,
            action_id,
        } => r.send(UserMessage::UndoRedo {
            user_id,
            private_id,
            action_type,
            action_id,
        }),
        BoardMessage::Empty {
            private_id,
            action_type,
        } => r.send(UserMessage::Empty {
            user_id,
            private_id,
            action_type,
        }),

        BoardMessage::SetSize { private_id, data } => r.send(UserMessage::SetSize {
            user_id,
            private_id,
            data,
        }),

        BoardMessage::UpdateCoEditor { private_id } => r.send(UserMessage::UpdateCoEditor {
            user_id,
            private_id,
        }),

        BoardMessage::Pull { current, undone } => r.send(UserMessage::Pull {
            user_id,
            current,
            undone,
        }),
    }
}
