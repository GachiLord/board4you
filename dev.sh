#!/bin/bash

export PUBLIC_PATH="${PWD}/client/public/"

export RUST_BACKTRACE=1
export RUST_LOG=trace

cd server && cargo run