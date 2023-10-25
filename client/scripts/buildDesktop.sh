cp ./node_modules/pdfjs-dist/build/pdf.worker* ./public/;
cp ./node_modules/pdfkit/js/data/ ./public/ -r;
./node_modules/.bin/esbuild ./src/entries/desktop.tsx --bundle --outdir=./public --loader:.png=dataurl --minify;