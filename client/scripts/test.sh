clear
./node_modules/.bin/esbuild `find ./test \( -name '*.ts' -o -name '*.tsx' \)` --sourcemap --outdir=./test/dist --loader:.png=dataurl --loader:.node=copy --format=cjs --bundle --platform=node
node --test ./test/dist