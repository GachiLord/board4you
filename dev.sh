#!/bin/bash

export PUBLIC_PATH="${PWD}/client/public/"
export DB_PORT=5432
export DB_HOST=localhost
export DB_USER=board4you
export CLEANUP_INTERVAL_MINUTES=1
export DB_INIT_PATH="${PWD}/db/init/init.sql"
export DB_PASSWORD_PATH="${PWD}/db/credentials/db_password"

export RUST_BACKTRACE=1
export RUST_LOG=trace

cd server && cargo run
