#!/bin/bash

cd protocol
wasm-pack build --target bundler
cd ..
cp protocol/pkg/* client/src/renderer/lib/protocol -r
echo "Library is located in ./client/src/renderer/lib/protocol"
