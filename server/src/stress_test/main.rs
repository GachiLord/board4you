#[macro_use]
extern crate lazy_static;

use clap::Parser;
use futures_util::{SinkExt, StreamExt};
use handlebars::Handlebars;
use reqwest::Client;
use serde::Deserialize;
use std::collections::HashMap;
use std::{fs, usize};
use tokio::task::JoinHandle;
use tokio::{signal, spawn, time};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

// stress test implementaion

#[derive(Deserialize, Debug)]
struct RoomData {
    public_id: Box<String>,
    private_id: Box<String>,
}

type StaticRoomData = HashMap<&'static str, &'static mut str>;

impl RoomData {
    fn as_leaked_hashmap(self) -> StaticRoomData {
        HashMap::from([
            ("public_id", self.public_id.leak()),
            ("private_id", self.private_id.leak()),
        ])
    }
}

struct Messages {
    templates: Handlebars<'static>,
}

impl Messages {
    fn new() -> Messages {
        // read files
        let join = fs::read_to_string("./src/stress_test/join.json").unwrap();
        let pull = fs::read_to_string("./src/stress_test/pull.json").unwrap();
        let push = fs::read_to_string("./src/stress_test/push.json").unwrap();
        let push_segment_start =
            fs::read_to_string("./src/stress_test/push_segment_start.json").unwrap();
        let push_segment_update =
            fs::read_to_string("./src/stress_test/push_segment_update.json").unwrap();
        let push_segment_end =
            fs::read_to_string("./src/stress_test/push_segment_end.json").unwrap();
        // add templates
        let mut handlebars = Handlebars::new();
        handlebars.register_escape_fn(|s| s.to_owned());
        handlebars.register_template_string("join", join).unwrap();
        handlebars.register_template_string("pull", pull).unwrap();
        handlebars.register_template_string("push", push).unwrap();
        handlebars
            .register_template_string("push_segment_start", push_segment_start)
            .unwrap();
        handlebars
            .register_template_string("push_segment_update", push_segment_update)
            .unwrap();
        handlebars
            .register_template_string("push_segment_end", push_segment_end)
            .unwrap();

        Messages {
            templates: handlebars,
        }
    }

    fn join(&self, room_data: &StaticRoomData) -> String {
        self.templates.render("join", &room_data).unwrap()
    }

    fn pull(&self, room_data: &StaticRoomData) -> String {
        self.templates.render("pull", &room_data).unwrap()
    }

    fn push(&self, room_data: &StaticRoomData) -> String {
        self.templates.render("push", &room_data).unwrap()
    }

    fn push_segment_start(&self, room_data: &StaticRoomData) -> String {
        self.templates
            .render("push_segment_start", &room_data)
            .unwrap()
    }

    fn push_segment_update(&self, room_data: &StaticRoomData) -> String {
        self.templates
            .render("push_segment_update", &room_data)
            .unwrap()
    }

    fn push_segment_end(&self, room_data: &StaticRoomData) -> String {
        self.templates
            .render("push_segment_end", &room_data)
            .unwrap()
    }
}

lazy_static! {
    static ref MESSAGES: Messages = Messages::new();
}

async fn create_room(client: &Client) -> RoomData {
    let body = fs::read_to_string("./src/stress_test/create_room.json")
        .expect("this bin should be run from 'server' folder");
    client
        .post("http://localhost:3000/api/room")
        .body(body)
        .send()
        .await
        .unwrap()
        .json::<RoomData>()
        .await
        .unwrap()
}

async fn editor_task(msgs: &Messages, room_data: &StaticRoomData) {
    // connect to the socket
    let (ws_stream, _) = connect_async("ws://localhost:3000/board").await.expect(
        "Failed to connect. Make sure your socket limit let you create desired amount of rooms.",
    );
    let (mut write, mut read) = ws_stream.split();
    // send join message
    let _ = write.send(Message::Text(msgs.join(room_data))).await;
    // wait for joining the room
    let _ = read.next().await;
    // send pull message
    let _ = write.send(Message::Text(msgs.pull(room_data))).await;
    // send a new shape periodically
    loop {
        // TODO: This part is currently disabled due to the ineffective way used to send websocket messages.
        // Uncomment this, when or if it is improved
        //
        //// send push start
        //let _ = write
        //    .send(Message::Text(msgs.push_segment_start(room_data)))
        //    .await;
        //// send segments of the line every 200ms
        //for _ in 0..20 {
        //    let _ = write
        //        .send(Message::Text(msgs.push_segment_update(room_data)))
        //        .await;
        //    time::sleep(time::Duration::from_millis(100)).await;
        //}
        //// finish drawing the line
        //let _ = write
        //    .send(Message::Text(msgs.push_segment_end(room_data)))
        //    .await;
        //
        // send a push
        let _ = write.send(Message::Text(msgs.push(room_data))).await;
        // await a second
        time::sleep(time::Duration::from_secs(1)).await;
    }
}

async fn user_task(msgs: &Messages, room_data: &StaticRoomData) {
    // connect to the socket
    let (ws_stream, _) = connect_async("ws://localhost:3000/board")
        .await
        .expect("Failed to connect");
    let (mut write, read) = ws_stream.split();
    // send join message
    let _ = write.send(Message::Text(msgs.join(room_data))).await;
    // wait for joining the room
    read.for_each(|_| async {}).await;
}

fn spawn_editor(room_data: &'static StaticRoomData) -> JoinHandle<()> {
    spawn(async move { editor_task(&MESSAGES, &room_data).await })
}

fn spawn_user(room_data: &'static StaticRoomData) -> JoinHandle<()> {
    spawn(async move { user_task(&MESSAGES, &room_data).await })
}

fn spawn_room(editors_amount: usize, users_amount: usize) -> JoinHandle<()> {
    spawn(async move {
        let client = Client::new();
        let room_data: &'static StaticRoomData =
            Box::leak(Box::new(create_room(&client).await.as_leaked_hashmap()));

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
