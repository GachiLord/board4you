#!/bin/bash

project_dir=${PWD}

export RUST_BACKTRACE=1
export RUST_LOG=trace

cd server && cargo run "${project_dir}/client/public/"