import esbuild from 'esbuild'
import { wasmLoader } from 'esbuild-plugin-wasm'

// retrive build vars
const args = process.argv;
let dev = false
let target = 'web'

let i = 0
while (i < args.length) {
  const arg = args[i]
  if (arg == '--dev') dev = true
  if (arg == '--target') {
    i++
    target = args[i]
  }
  i++
}
// build config
/**
   * @type {import('esbuild').BuildOptions}
   */
const config = {
  entryPoints: ["./src/entries/web.tsx"],
  format: 'esm',
  outdir: './public',
  bundle: true,
  minify: !dev,
  metafile: !dev,
  sourcemap: dev,
  logLevel: 'info',
  alias: target == 'web' ? {
    'pdfjs-dist': './src/common/empty.ts',
    'jspdf': './src/common/empty.ts'
  } : undefined,
  publicPath: '/public',
  loader: {
    '.png': 'file'
  },
  plugins: [
    wasmLoader()
  ]
}

if (dev) {
  const ctx = await esbuild.context(config)
  await ctx.watch()
  console.log('watching...')
} else {
  await esbuild.build(config)
  console.log('built')
}

