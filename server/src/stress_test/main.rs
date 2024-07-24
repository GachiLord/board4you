use clap::Parser;
use futures_util::{SinkExt, StreamExt};
use protocol::board_protocol::edit::Edit as EditInner;
use protocol::board_protocol::user_message::Msg;
use protocol::board_protocol::Add;
use protocol::board_protocol::Auth;
use protocol::board_protocol::Edit;
use protocol::board_protocol::Pull;
use protocol::board_protocol::Push;
use protocol::board_protocol::Shape;
use protocol::board_protocol::ShapeType;
use protocol::board_protocol::Tool;
use protocol::board_protocol::UserMessage;
use protocol::encode_user_msg;
use reqwest::Client;
use serde::Deserialize;
use std::{fs, usize};
use tokio::task::JoinHandle;
use tokio::{signal, spawn, time};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use uuid::Uuid;

// stress test implementaion

#[derive(Deserialize, Debug)]
struct RoomData {
    public_id: Box<str>,
    private_id: Box<str>,
}

impl Into<RoomDataStatic> for RoomData {
    fn into(self) -> RoomDataStatic {
        RoomDataStatic {
            public_id: Box::leak(self.public_id),
            private_id: Box::leak(self.private_id),
        }
    }
}

struct RoomDataStatic {
    public_id: &'static mut str,
    private_id: &'static mut str,
}

async fn create_room(client: &Client) -> RoomData {
    let body = fs::read_to_string("./src/stress_test/create_room.json")
        .expect("this bin should be run from 'server' folder");
    let res = client
        .post("http://localhost:3000/api/room")
        .header("content-type", "application/json")
        .body(body)
        .send()
        .await
        .unwrap();
    res.json::<RoomData>().await.unwrap()
}

fn pull() -> Vec<u8> {
    let msg = UserMessage {
        msg: Some(Msg::Pull(Pull {
            current: vec![],
            undone: vec![],
        })),
    };
    encode_user_msg(msg)
}

fn push() -> Vec<u8> {
    let id = Uuid::new_v4().to_string();
    let edit = EditInner::Add(Add {
        id: id.to_owned(),
        shape: Some(Shape {
            x: 0.0,
            y: 0.0,
            tool: Tool::PenTool as i32,
            shape_type: ShapeType::Line as i32,
            shape_id: id,
            color: "black".to_owned(),
            line_size: 3.0,
            line_type: "earaser".to_owned(),
            height: 0.0,
            width: 0.0,
            radius_x: 0.0,
            radius_y: 0.0,
            rotation: 0.0,
            scale_x: 1.0,
            scale_y: 1.0,
            skew_x: 0.0,
            skew_y: 0.0,
            points: vec![0, 100],
            connected: vec![],
            url: "".to_owned(),
        }),
    });
    let msg = UserMessage {
        msg: Some(Msg::Push(Push {
            data: vec![Edit { edit: Some(edit) }],
            silent: false,
        })),
    };
    encode_user_msg(msg)
}

fn auth(token: String) -> Vec<u8> {
    let msg = UserMessage {
        msg: Some(Msg::Auth(Auth { token })),
    };
    encode_user_msg(msg)
}

async fn editor_task(room_data: &RoomDataStatic) {
    // connect to the socket
    let (ws_stream, _) = connect_async(format!(
        "ws://localhost:3000/ws/board/{}",
        room_data.public_id
    ))
    .await
    .expect(
        "Failed to connect. Make sure your socket limit let you create desired amount of rooms.",
    );
    let (mut write, mut read) = ws_stream.split();
    // send pull message
    let _ = write
        .send(Message::Binary(auth(room_data.private_id.to_owned())))
        .await;
    let _ = write.send(Message::Binary(pull())).await;
    // wait for PullData
    let _ = read.next().await;
    let _ = read.next().await;
    // send a new shape periodically
    loop {
        // send push msg
        let _ = write.send(Message::Binary(push())).await;
        // await a second
        time::sleep(time::Duration::from_secs(3)).await;
    }
}

async fn user_task(room_data: &RoomDataStatic) {
    // connect to the socket
    let (ws_stream, _) = connect_async(format!(
        "ws://localhost:3000/ws/board/{}",
        room_data.public_id
    ))
    .await
    .expect("Failed to connect");
    let (mut write, read) = ws_stream.split();
    // send join message
    let _ = write.send(Message::Binary(pull())).await;
    // wait for joining the room
    read.for_each(|_| async {}).await;
}

fn spawn_editor(room_data: &'static RoomDataStatic) -> JoinHandle<()> {
    spawn(async move { editor_task(&room_data).await })
}

fn spawn_user(room_data: &'static RoomDataStatic) -> JoinHandle<()> {
    spawn(async move { user_task(&room_data).await })
}

fn spawn_room(editors_amount: usize, users_amount: usize) -> JoinHandle<()> {
    spawn(async move {
        let client = Client::new();
        let room_data: &'static RoomDataStatic =
            Box::leak(Box::new(create_room(&client).await.into()));

        for _ in 0..editors_amount {
            spawn_user(&room_data);
        }
        for _ in 0..users_amount {
            spawn_editor(&room_data);
        }
    })
}

// CLI tool

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    #[arg(short, long, default_value_t = 500)]
    rooms: usize,

    #[arg(short, long, default_value_t = 20)]
    users: usize,

    #[arg(short, long, default_value_t = 1)]
    editors: usize,
}

#[tokio::main]
async fn main() {
    let args = Args::parse();
    let users_amount = (args.users + args.editors) * args.rooms;

    println!("app has {} virtual users", users_amount);
    println!("press ctrl+c to stop test");

    for _ in 0..args.rooms {
        spawn_room(args.editors, args.users);
    }

    signal::ctrl_c().await.unwrap();
}
