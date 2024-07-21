mod utils;

#[cfg(target_family = "unix")]
use prost::DecodeError;
use prost::Message;
#[cfg(target_family = "wasm")]
use wasm_bindgen::prelude::*;

pub mod board_protocol {
    include!(concat!(env!("OUT_DIR"), "/board.rs"));
}

use board_protocol::ServerMessage;
use board_protocol::UserMessage;
#[cfg(target_family = "wasm")]
use utils::set_panic_hook;

// execution stuff

#[cfg(target_family = "wasm")]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[cfg(target_family = "wasm")]
#[wasm_bindgen(start)]
fn start() {
    set_panic_hook();
}

// lib

#[cfg(target_family = "unix")]
pub fn encode_server_msg(msg: &ServerMessage) -> Vec<u8> {
    let mut buf = Vec::with_capacity(msg.encoded_len());
    msg.encode(&mut buf).unwrap();
    buf
}

#[cfg(target_family = "wasm")]
#[wasm_bindgen]
pub fn decode_server_msg(buf: &[u8]) -> Result<ServerMessage, String> {
    ServerMessage::decode(buf).map_err(|err| err.to_string())
}

#[cfg(target_family = "unix")]
pub fn decode_server_msg(buf: &[u8]) -> Result<ServerMessage, DecodeError> {
    ServerMessage::decode(buf)
}

#[cfg(target_family = "wasm")]
#[wasm_bindgen]
pub fn encode_user_msg(msg: UserMessage) -> Vec<u8> {
    let mut buf = Vec::with_capacity(msg.encoded_len());
    msg.encode(&mut buf).unwrap();
    buf
}

#[cfg(target_family = "unix")]
pub fn decode_user_msg(buf: &[u8]) -> Result<UserMessage, String> {
    UserMessage::decode(buf).map_err(|err| err.to_string())
}
