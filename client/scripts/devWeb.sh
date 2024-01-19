cp ./node_modules/pdfjs-dist/build/pdf.worker* ./public/
cp ./build/icon.ico ./public/favicon.ico
./node_modules/.bin/esbuild ./src/entries/web.tsx --bundle --sourcemap --outdir=./public --loader:.png=dataurl --watch

