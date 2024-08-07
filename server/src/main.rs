// libs
use axum::{routing::get, Router};
use bb8::{Pool, RunError};
use bb8_postgres::PostgresConnectionManager;
use fast_log::config::Config;
use jwt_simple::prelude::*;
use lazy_static::lazy_static;
use log::error;
use std::{env, fs, path::PathBuf, sync::atomic::AtomicUsize};
use std::{error::Error, path::Path};
use tokio::signal::unix::signal;
use tokio::sync::oneshot;
use tokio_postgres::NoTls;
use tower_http::services::{ServeDir, ServeFile};

use crate::websocket::ws_handler;
use libs::state::{DbClient, Rooms};
use lifecycle::on_shutdown;
use lifecycle::{cleanup, monitor};

// modules
mod api;
mod entities;
mod libs;
mod lifecycle;
mod websocket;

// env vars

lazy_static! {
    pub static ref NO_PERSIST: bool = &env::var("NO_PERSIST").unwrap_or("0".to_owned()) == "1";
    pub static ref CLEANUP_INTERVAL_MINUTES: u64 = match &env::var("CLEANUP_INTERVAL_MINUTES") {
        Ok(t) => t
            .parse()
            .expect("$CLEANUP_INTERVAL_MINUTES must be u64 integer"),
        Err(_) => 30,
    };
    pub static ref MONITOR_INTERVAL_MINUTES: u64 = match &env::var("MONITOR_INTERVAL_MINUTES") {
        Ok(t) => t
            .parse()
            .expect("$MONITOR_INTERVAL_MINUTES must be u64 integer"),
        Err(_) => 5,
    };
    pub static ref JWT_SECRET_KEY: &'static HS256Key = {
        let key = fs::read_to_string(
            &env::var("JWT_SECRET_PATH").unwrap_or("/run/secrets/jwt_secret".to_string()),
        )
        .expect("jwt_secret is not found");
        let key_ref = Box::leak(Box::new(HS256Key::from_bytes(key.as_bytes())));
        key_ref
    };
    static ref PUBLIC_PATH: &'static Path = {
        let s = env::var("PUBLIC_PATH")
            .expect("$PUBLIC_PATH is not provided")
            .leak();
        Path::new(s)
    };
}

// app state

#[derive(Clone)]
pub struct PoolWrapper {
    inner: &'static Pool<PostgresConnectionManager<NoTls>>,
}

impl PoolWrapper {
    /// Returns an owned connection from connection bb8 pool
    ///
    /// # Panics
    ///
    /// Panics if failed to get a connection
    pub async fn get(&self) -> DbClient {
        match self.inner.get_owned().await {
            Ok(c) => c,
            Err(e) => {
                error!(
                    "failed to get a postgres client from connection pool: {}",
                    e.to_string()
                );
                panic!("failed to get a postgres client from connection pool");
            }
        }
    }

    pub async fn try_get(&self) -> Result<DbClient, RunError<tokio_postgres::Error>> {
        self.inner.get_owned().await
    }
}

#[derive(Clone)]
struct AppState {
    pool: &'static PoolWrapper,
    rooms: Rooms,
}

pub static NEXT_USER_ID: AtomicUsize = AtomicUsize::new(1);

// app

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
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
    let manager = PostgresConnectionManager::new_from_stringlike(
        &format!("host={db_host} port={db_port} user={db_user} password={db_password}"),
        NoTls,
    )
    .expect("failed to create db connection pool");
    let pool = Box::leak(Box::new(Pool::builder().build(manager).await.unwrap()));
    // initialize db
    let pool_wrapper = Box::leak(Box::new(PoolWrapper { inner: pool }));
    pool.get_owned()
        .await
        .unwrap()
        .batch_execute(&init_sql)
        .await?;
    // create state of the app
    let rooms = Rooms::default();
    let state = AppState {
        pool: pool_wrapper,
        rooms: rooms.clone(),
    };
    // routes
    let mut routes = Router::new();
    // apis
    routes = routes.nest("/api", api::api(state.clone()));
    // ws route
    routes = routes.route("/ws/board/:public_id", get(ws_handler));
    // static paths
    let mut index_path = PathBuf::new();
    index_path.push(*PUBLIC_PATH);
    index_path.push("web.html");

    routes = routes.nest_service("/", ServeFile::new(&index_path));
    routes = routes.nest_service("/board", ServeFile::new(&index_path));
    routes = routes.nest_service("/boards/own", ServeFile::new(&index_path));
    routes = routes.nest_service("/signin", ServeFile::new(&index_path));
    routes = routes.nest_service("/signup", ServeFile::new(&index_path));
    routes = routes.nest_service("/profile", ServeFile::new(&index_path));
    routes = routes.nest_service("/folder", ServeFile::new(&index_path));
    routes = routes.nest_service("/folders", ServeFile::new(&index_path));
    routes = routes.nest_service("/public", ServeDir::new(*PUBLIC_PATH));
    // cleanup task
    let rooms_clean_up = rooms.clone();
    let rooms_to_monitor = rooms.clone();
    tokio::spawn(async move {
        cleanup(rooms_clean_up).await;
    });
    // create monitoring task
    tokio::spawn(async move {
        monitor(rooms_to_monitor).await;
    });
    // run server
    let mut stream = signal(tokio::signal::unix::SignalKind::terminate()).unwrap();
    let (tx, rx) = oneshot::channel();
    // spawn server task
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("Failed to create tcp socket on 3000 port");
    tokio::spawn(async move {
        axum::serve(listener, routes.with_state(state))
            .with_graceful_shutdown(async { rx.await.unwrap() })
            .await
            .unwrap();
    });
    // wait for a signal
    tokio::select! {
        _ = tokio::signal::ctrl_c() => {
            if !*NO_PERSIST {
                on_shutdown(rooms.clone()).await
            };
            tx.send(()).unwrap();
        },
        _ = stream.recv() => {
            if !*NO_PERSIST {
                on_shutdown(rooms.clone()).await
            };
            tx.send(()).unwrap();
        }
    }
    Ok(())
}
