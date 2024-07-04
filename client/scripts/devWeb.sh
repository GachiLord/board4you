cp ./node_modules/pdfjs-dist/build/pdf.worker* ./public/
cp ./build/icon.ico ./public/favicon.ico
node build.mjs --dev
