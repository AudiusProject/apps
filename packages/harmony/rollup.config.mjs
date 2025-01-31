import { createRequire } from 'node:module'

import alias from '@rollup/plugin-alias'
import image from '@rollup/plugin-image'
import json from '@rollup/plugin-json'
import svgr from '@svgr/rollup'
import postcss from 'rollup-plugin-postcss'
import rollupTypescript from 'rollup-plugin-typescript2'

import pkg from './package.json' assert { type: 'json' }

const cjsRequire = createRequire(import.meta.url)
const tspCompiler = cjsRequire('ts-patch/compiler')

const external = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
  '@emotion/react/jsx-runtime',
  '@emotion/cache',
  '@emotion/is-prop-valid',
  '@emotion/css',
  'bn.js'
]

export default {
  input: 'src/index.ts',
  output: [
    {
      dir: 'dist',
      format: 'es',
      exports: 'named',
      sourcemap: true,
      preserveModules: true
    }
  ],
  plugins: [
    json(),
    alias({
      // Properly resolve json files from assets folder
      entries: [{ find: /^assets\/(.*)/, replacement: 'src/assets/$1' }]
    }),
    postcss({
      minimize: true,
      extract: 'harmony.css',
      modules: true
    }),
    svgr(),
    image(),
    rollupTypescript({
      typescript: tspCompiler,
      clean: true
    })
  ],
  external
}
