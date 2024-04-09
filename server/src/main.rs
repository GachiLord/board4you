// libs
use api::{handle_rejection, request_hanlder, with_jwt_cookies};
use fast_log::config::Config;
use jwt_simple::prelude::*;
use libs::state::{Rooms, WSUsers};
use lifecycle::{cleanup, monitor};
use log::error;
use std::convert::Infallible;
use std::error::Error;
use std::path::Path;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::{env, fs};
use tokio::signal::unix::signal;
use tokio::sync::oneshot;
use tokio::time;
use tokio_postgres::{Client, NoTls};
use warp::Filter;
use websocket::user_connected;

use crate::lifecycle::on_shutdown;
// modules
mod api;
mod entities;
mod libs;
mod lifecycle;
mod websocket;

// unique id
static NEXT_USER_ID: AtomicUsize = AtomicUsize::new(1);

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // no persist flag
    let no_persist = &env::var("NO_PERSIST").unwrap_or("0".to_owned()) == "1";
    // initialize logging system
    fast_log::init(Config::new().console()).unwrap();
    // Connect to the database.
    let db_user = &env::var("DB_USER").expect("$DB_USER is not provided");
    let db_host = &env::var("DB_HOST").expect("$DB_HOST is not provided");
    let db_port = &env::var("DB_PORT").expect("$DB_PORT is not provided");
    let db_password = fs::read_to_string(
        &env::var("DB_PASSWORD_PATH").unwrap_or("/run/secrets/db_password".to_string()),
    )
    .expect("db_password is not found");
    let init_sql =
        fs::read_to_string(&env::var("DB_INIT_PATH").expect("$DB_INIT_PATH is not provided"))?;
    let (client, connection) = tokio_postgres::connect(
        format!("host={db_host} port={db_port} user={db_user} password={db_password}").as_ref(),
        NoTls,
    )
    .await?;
    // The connection object performs the actual communication with the database,
    // so spawn it off to run on its own.
    tokio::spawn(async move {
        if let Err(e) = connection.await {
            error!("connection error: {}", e);
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
        .and(with_ws_users(users.clone()))
        .and(with_rooms(rooms.clone()))
        .and(with_db_client(client.clone()))
        .map(move |ws: warp::ws::Ws, users, rooms, db_client| {
            ws.on_upgrade(move |socket| {
                user_connected(
                    NEXT_USER_ID.fetch_add(1, Ordering::Relaxed),
                    db_client,
                    socket,
                    users,
                    rooms,
                )
            })
        });
    // static paths
    let public_path = (&env::var("PUBLIC_PATH").expect("$PUBLIC_PATH is not provided")).to_owned();
    let index_path = Path::new(&public_path)
        .join("web.html")
        .to_str()
        .unwrap()
        .to_owned();
    let index_path: &'static str = Box::leak(index_path.into_boxed_str());
    // routing static files
    let home_page = warp::path::end().and(warp::fs::file(index_path));
    let edit_page = warp::path("board").and(warp::fs::file(index_path));
    let own_boards_page = warp::path("boards")
        .and(warp::path("own"))
        .and(warp::fs::file(index_path));
    let signin_page = warp::path("signin").and(warp::fs::file(index_path));
    let signup_page = warp::path("signup").and(warp::fs::file(index_path));
    let profile_page = warp::path("profile").and(warp::fs::file(index_path));
    let folder_page = warp::path("folder").and(warp::fs::file(index_path));
    let own_folders_page = warp::path("folders")
        .and(warp::path("own"))
        .and(warp::fs::file(index_path));
    let default_route = home_page
        .or(edit_page)
        .or(own_boards_page)
        .or(signin_page)
        .or(signup_page)
        .or(profile_page)
        .or(folder_page)
        .or(own_folders_page);
    let static_site = warp::fs::dir(public_path).or(default_route);
    // jwt private key
    let jwt_secret_value = fs::read_to_string(
        &env::var("JWT_SECRET_PATH").unwrap_or("/run/secrets/jwt_secret".to_string()),
    )
    .expect("jwt_secret is not found");
    let jwt_key = Arc::new(HS256Key::from_bytes(jwt_secret_value.as_bytes()));
    // apis
    let apis = api::api(
        client.clone(),
        jwt_key.clone(),
        rooms.clone(),
        users.clone(),
    )
    .or(board)
    .and(with_db_client(client.clone()))
    .and(with_jwt_key(jwt_key))
    .and(with_jwt_cookies())
    .and_then(request_hanlder);
    // bundle all routes
    let routes = apis.or(static_site).recover(handle_rejection);
    // create cleanup task to remove unused rooms
    let cleanup_interval: u64 = match &env::var("CLEANUP_INTERVAL_MINUTES") {
        Ok(t) => t
            .parse()
            .expect("$CLEANUP_INTERVAL_MINUTES must be u64 integer"),
        Err(_) => 30,
    };
    // cleanup task
    let rooms_clean_up = rooms.clone();
    let rooms_to_monitor = rooms.clone();
    tokio::spawn(async move {
        cleanup(
            rooms_clean_up,
            time::Duration::from_secs(cleanup_interval * 60),
            no_persist,
        )
        .await;
    });
    // create monitoring task
    let monitor_interval: u64 = match &env::var("MONITOR_INTERVAL_MINUTES") {
        Ok(t) => t
            .parse()
            .expect("$MONITOR_INTERVAL_MINUTES must be u64 integer"),
        Err(_) => 5,
    };
    tokio::spawn(async move {
        monitor(
            time::Duration::from_secs(monitor_interval * 60),
            rooms_to_monitor,
            users,
        )
        .await;
    });
    // run server
    let mut stream = signal(tokio::signal::unix::SignalKind::terminate()).unwrap();
    let (tx, rx) = oneshot::channel();
    // spawn server task
    let (_, server) = warp::serve(routes)
        .bind_with_graceful_shutdown(([0, 0, 0, 0], 3000), async move { rx.await.ok().unwrap() });
    tokio::spawn(server);
    // wait for a signal
    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            if !no_persist {
                on_shutdown(rooms.clone()).await;
            }
            tx.send(()).unwrap();
        },
        _ = stream.recv() => {
            if !no_persist {
                on_shutdown(rooms.clone()).await;
            }
            tx.send(()).unwrap();
        }
    }
    // return ok
    Ok(())
}

// shared resources

pub fn with_ws_users(
    users: WSUsers,
) -> impl Filter<Extract = (WSUsers,), Error = Infallible> + Clone {
    warp::any().map(move || users.clone())
}

pub fn with_rooms(rooms: Rooms) -> impl Filter<Extract = (Rooms,), Error = Infallible> + Clone {
    warp::any().map(move || rooms.clone())
}

pub fn with_db_client(
    client: Arc<Client>,
) -> impl Filter<Extract = (Arc<Client>,), Error = Infallible> + Clone {
    warp::any().map(move || client.clone())
}

pub fn with_jwt_key(
    key: Arc<HS256Key>,
) -> impl Filter<Extract = (Arc<HS256Key>,), Error = Infallible> + Clone {
    warp::any().map(move || key.clone())
}
