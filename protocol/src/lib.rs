mod utils;

use prost::Message;
use wasm_bindgen::prelude::*;

pub mod board_protocol {
    include!(concat!(env!("OUT_DIR"), "/board.rs"));
}

use board_protocol::ServerMessage;
use board_protocol::UserMessage;

#[cfg(target_family = "unix")]
#[wasm_bindgen]
pub fn encode_server_msg(msg: ServerMessage) -> Vec<u8> {
    let mut buf = Vec::with_capacity(msg.encoded_len());
    msg.encode(&mut buf).unwrap();
    buf
}

#[cfg(target_family = "wasm")]
#[wasm_bindgen]
pub fn decode_server_msg(buf: &[u8]) -> Result<ServerMessage, String> {
    ServerMessage::decode(buf).map_err(|err| err.to_string())
}

#[cfg(target_family = "wasm")]
#[wasm_bindgen]
pub fn encode_user_msg(msg: UserMessage) -> Vec<u8> {
    let mut buf = Vec::with_capacity(msg.encoded_len());
    msg.encode(&mut buf).unwrap();
    buf
}

#[cfg(target_family = "unix")]
#[wasm_bindgen]
pub fn decode_user_msg(buf: &[u8]) -> Result<UserMessage, String> {
    UserMessage::decode(buf).map_err(|err| err.to_string())
}
