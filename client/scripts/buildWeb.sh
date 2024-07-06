cp ./node_modules/pdfjs-dist/build/pdf.worker.js ./public/pdf.worker.js
cp ./build/icon.ico ./public/favicon.ico
node build.mjs --target web
