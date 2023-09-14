#!/bin/bash

project_dir=${PWD}

cd server && cargo run "${project_dir}/client/bundles/"