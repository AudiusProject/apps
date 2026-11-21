import { createRequire } from 'node:module'

import postcss from 'rollup-plugin-postcss'
import rollupTypescript from 'rollup-plugin-typescript2'

import { NO_FONTS_CSS, harmonyCssWithFonts } from './rollup.fonts.mjs'

const cjsRequire = createRequire(import.meta.url)
const tspCompiler = cjsRequire('ts-patch/compiler')

export default {
  input: 'src/css-entry.ts',
  output: {
    dir: 'dist',
    format: 'es',
    entryFileNames: () => 'harmony.css.placeholder.js',
    sourcemap: false
  },
  plugins: [
    rollupTypescript({
      typescript: tspCompiler,
      clean: false,
      useTsconfigDeclarationDir: false,
      check: false
    }),
    postcss({
      minimize: true,
      extract: NO_FONTS_CSS,
      modules: true,
      inject: false
    }),
    harmonyCssWithFonts()
  ],
  external: (id) => !id.endsWith('.css'),
  treeshake: false
}
