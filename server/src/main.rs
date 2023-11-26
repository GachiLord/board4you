use std::convert::Infallible;
use std::sync::Arc;
use std::{env, fs};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::path::Path;
use tokio::signal::unix::signal;
use tokio::time;
use warp::Filter;
use tokio_postgres::{NoTls, Client};
use std::error::Error;
// modules
mod user;
mod message;
mod board;
mod state;
mod api;
mod connect;
mod cleanup;
use connect::user_connected;
use crate::state::{Rooms, WSUsers};
use crate::api::room_filter;
use crate::cleanup::remove_unused_rooms;

// unique id
static NEXT_USER_ID: AtomicUsize = AtomicUsize::new(1);

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>>{
    // Connect to the database.
    let db_user = &env::var("DB_USER").expect("$DB_USER is not provided");
    let db_host = &env::var("DB_HOST").expect("$DB_HOST is not provided");
    let db_port = &env::var("DB_PORT").expect("$DB_PORT is not provided");
    let db_password = fs::read_to_string(&env::var("DB_PASSWORD_PATH").unwrap_or("/run/secrets/db_password".to_string())).unwrap_or("root".to_string());
    let init_sql = fs::read_to_string(&env::var("DB_INIT_PATH").expect("$DB_INIT_PATH is not provided"))?;
    let (client, connection) =
        tokio_postgres::connect(format!("host={db_host} port={db_port} user={db_user} password={db_password}").as_ref(), NoTls).await?;
    // The connection object performs the actual communication with the database,
    // so spawn it off to run on its own.
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("connection error: {}", e);
        }
    });
    let client = Arc::new(client);
    // initialize db
    client.batch_execute(&init_sql).await?;
    // create state of the app
    let users = WSUsers::default();
    let rooms = Rooms::default();
    // filters for Rc
    // ws route
    let board = warp::path("board")
        .and(warp::ws())
        .and(with_ws_users(users))
        .and(with_rooms(rooms.clone()))
        .and(with_db_client(client.clone()))
        .map(move |ws: warp::ws::Ws, users, rooms, db_client| {
            ws.on_upgrade(move |socket| user_connected(NEXT_USER_ID.fetch_add(1, Ordering::Relaxed), db_client, socket, users, rooms))
        });
    // static paths
    let public_path = &env::var("PUBLIC_PATH").expect("$PUBLIC_PATH is not provided");
    let index_path = Path::new(&public_path).join("web.html");
    // routing static files
    let default_route = warp::fs::file(index_path);
    let static_site = warp::fs::dir(public_path.to_owned()).or(default_route);
    // apis
    let apis = room_filter(rooms.clone());
    // bundle all routes
    let routes = apis.or(board).or(static_site);
    // create cleanup task to remove unused rooms
    let cleanup_interval: u64 = match &env::var("CLEANUP_INTERVAL_MINUTES"){
        Ok(t) => t.parse().expect("$CLEANUP_INTERVAL_MINUTES must be u64 integer"),
        Err(_) => 30
    };
    tokio::spawn(async move {
        remove_unused_rooms(&client, &rooms, time::Duration::from_secs(cleanup_interval * 60)).await;
    });
    // run server
    let mut stream = signal(tokio::signal::unix::SignalKind::terminate()).unwrap();
    let (_, server) = warp::serve(routes)
        .bind_with_graceful_shutdown(([0, 0, 0, 0], 3000), async move {
            stream.recv().await
                .expect("failed to listen to shutdown signal");
    });
    server.await;
    Ok(())
}


pub fn with_ws_users(users: WSUsers) -> impl Filter<Extract = (WSUsers,), Error = Infallible> + Clone {
    warp::any().map(move || users.clone())
}

pub fn with_rooms(rooms: Rooms) -> impl Filter<Extract = (Rooms,), Error = Infallible> + Clone {
    warp::any().map(move || rooms.clone())
}

pub fn with_db_client(client: Arc<Client>) -> impl Filter<Extract = (Arc<Client>,), Error = Infallible> + Clone {
    warp::any().map(move || client.clone())
}