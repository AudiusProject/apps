import { createRequire } from 'node:module'

import postcss from 'rollup-plugin-postcss'
import rollupTypescript from 'rollup-plugin-typescript2'

const cjsRequire = createRequire(import.meta.url)
const tspCompiler = cjsRequire('ts-patch/compiler')

// CSS-only build: processes TypeScript to extract CSS
export default {
  input: 'src/css-entry.ts',
  output: {
    dir: 'dist',
    format: 'es',
    // Minimal JS output - just a placeholder since we only care about CSS
    entryFileNames: () => 'harmony.css.placeholder.js',
    sourcemap: false
  },
  plugins: [
    rollupTypescript({
      typescript: tspCompiler,
      clean: false,
      useTsconfigDeclarationDir: false,
      // Skip type checking to speed up
      check: false
    }),
    postcss({
      minimize: true,
      extract: 'harmony.css',
      modules: true,
      inject: false
    })
  ],
  // External everything since we only care about CSS extraction
  external: () => true,
  treeshake: false
}
