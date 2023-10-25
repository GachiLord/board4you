cp ./node_modules/pdfjs-dist/build/pdf.worker.js ./public/pdf.worker.js; 
./node_modules/.bin/esbuild ./src/entries/web.tsx --bundle --outdir=./public --loader:.png=dataurl --minify