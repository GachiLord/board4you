use crate::{
    libs::{
        room::{RoomChannel, UserMessage},
        state::UserId,
    },
    lifecycle::retrive_room_channel,
    AppState, NEXT_USER_ID,
};
use axum::body::Bytes;
use fastwebsockets::{upgrade, FragmentCollectorRead, Frame, OpCode, Payload, WebSocketError};
use log::{debug, warn};
use protocol::{
    board_protocol::{
        server_message::Msg::Info as InfoVariant, user_message::Msg as ProtcolUserMessageVariant,
        ActionType, EmptyActionType, Info, ServerMessage as ProtocolServerMessage,
        UserMessage as ProtocolUserMessage,
    },
    decode_user_msg, encode_server_msg,
};
use std::sync::{atomic::Ordering, Arc};
use tokio::sync::{
    mpsc::{error::SendError, unbounded_channel},
    oneshot,
};

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
            OpCode::Text | OpCode::Binary => {
                match decode_user_msg(frame.payload.as_ref()) {
                    Ok(msg) => {
                        if let Err(e) =
                            handle_message(&room_chan, user_id.clone(), &mut is_authed, msg).await
                        {
                            // if we can't send a msg, the room was most likely deleted
                            // So we should disconnect the user
                            warn!("try to send to non-existent room: {}", e);
                            break;
                        }
                    }
                    Err(e) => {
                        let msg = ProtocolServerMessage {
                            msg: Some(InfoVariant(Info {
                                status: "bad".to_owned(),
                                action: "unknown".to_owned(),
                                payload: "failed to decode the message".to_owned(),
                            })),
                        };
                        let bytes = Bytes::from(encode_server_msg(&msg).to_vec());
                        let _ = tx_m.send(bytes);
                        warn!("cannot decode the message: {}", e);
                    }
                }
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
    msg: ProtocolUserMessage,
) -> Result<(), SendError<UserMessage>> {
    if msg.msg.is_none() {
        return Ok(());
    }

    match msg.msg.unwrap() {
        ProtcolUserMessageVariant::Auth(data) => {
            let (sender, receiver) = oneshot::channel();
            if let Ok(r) = receiver.await {
                *is_authed = r;
            }
            r.send(UserMessage::Auth {
                user_id,
                token: data.token.into(),
                sender,
            })?
        }
        ProtcolUserMessageVariant::SetTitle(data) => {
            if *is_authed {
                r.send(UserMessage::SetTitle {
                    user_id,
                    title: data.title.into(),
                })?
            }
        }
        ProtcolUserMessageVariant::Push(data) => {
            if *is_authed {
                r.send(UserMessage::Push {
                    user_id,
                    data: data.data,
                    silent: data.silent,
                })?
            }
        }
        ProtcolUserMessageVariant::UndoRedo(data) => {
            if *is_authed {
                r.send(UserMessage::UndoRedo {
                    user_id,
                    action_type: ActionType::try_from(data.action_type).unwrap(),
                    action_id: data.action_id.into(),
                })?
            }
        }
        ProtcolUserMessageVariant::Empty(data) => {
            if *is_authed {
                r.send(UserMessage::Empty {
                    user_id,
                    action_type: EmptyActionType::try_from(data.action_type).unwrap(),
                })?
            }
        }
        ProtcolUserMessageVariant::SetSize(data) => {
            if *is_authed {
                r.send(UserMessage::SetSize {
                    user_id,
                    data: data.data,
                })?
            }
        }
        ProtcolUserMessageVariant::Pull(data) => r.send(UserMessage::Pull {
            user_id,
            current: data.current.into_iter().map(|d| d.into()).collect(),
            undone: data.undone.into_iter().map(|d| d.into()).collect(),
        })?,
    }

    Ok(())
}
