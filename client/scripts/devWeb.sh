cp ./node_modules/pdfjs-dist/build/pdf.worker* ./public/; 
./node_modules/.bin/esbuild ./src/entries/web.tsx --bundle --sourcemap --outdir=./public --loader:.png=dataurl --watch