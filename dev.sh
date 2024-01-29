#!/bin/bash

# app
export PUBLIC_PATH="${PWD}/client/public/"
export DB_PORT=5432
export DB_HOST=localhost
export DB_USER=board4you
export CLEANUP_INTERVAL_MINUTES=1
export DB_INIT_PATH="${PWD}/db/init.sql"
export DB_PASSWORD_PATH="${PWD}/secrets/db_password.txt"
export JWT_SECRET_PATH="${PWD}/secrets/jwt_secret.txt"
export ENV="DEVELOPMENT"
export LOG_PATH="${PWD}/log"
export MONITOR_INTERVAL_MINUTES=1
# rust
export RUST_BACKTRACE=1
export RUST_LOG=trace

cd server && cargo run
