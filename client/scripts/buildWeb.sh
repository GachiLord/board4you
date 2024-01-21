cp ./node_modules/pdfjs-dist/build/pdf.worker.js ./public/pdf.worker.js
cp ./build/icon.ico ./public/favicon.ico
./node_modules/.bin/esbuild ./src/entries/web.tsx --bundle --outdir=./public --loader:.png=dataurl --minify --metafile=./public/meta.json --platform=browser --alias:pdfjs-dist=./src/common/empty.ts --alias:jspdf=./src/common/empty.ts
