import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

import alias from '@rollup/plugin-alias'
import { babel } from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import ignore from 'rollup-plugin-ignore'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import { terser } from 'rollup-plugin-terser'
import { visualizer } from 'rollup-plugin-visualizer'

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8')
)

const extensions = ['.js', '.ts']

const external = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.devDependencies),
  ...Object.keys(pkg.peerDependencies),
  'hashids/cjs',
  'readable-stream',
  '@noble/hashes/utils',
  'debug'
]

const pluginTypescript = typescript({ tsconfig: './tsconfig.json' })

/**
 * For the browser bundle, these need to be internal because they either:
 * - contain deps that need to be polyfilled via `nodePolyfills`
 * - are ignored via `ignore`
 */
const browserInternal = [
  '@scure/base',
  '@noble/hashes/utils',
  'graceful-fs',
  'node-localstorage',
  'xmlhttprequest'
]

export const outputConfigs = {
  /**
   * SDK Node Package (ES Module + CommonJS)
   * Used by third parties consuming the SDK from Node. The `.cjs` output is
   * resolved via the `require` condition in package.json#exports so legacy
   * Node consumers (and CJS-heavy stacks) can `require('@audius/sdk')`
   * without hitting ESM/CJS interop edges on transitive deps.
   */
  sdkConfigEs: {
    input: 'src/index.ts',
    output: [
      {
        dir: 'dist',
        format: 'es',
        sourcemap: true,
        entryFileNames: '[name].esm.js'
      },
      {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: '[name].cjs',
        exports: 'named'
      }
    ],
    plugins: [
      resolve({ extensions, preferBuiltins: true }),
      commonjs({ extensions }),
      babel({ babelHelpers: 'bundled', extensions }),
      json(),
      pluginTypescript
    ],
    external
  },

  /**
   * SDK React Native Package
   * Used by the Audius React Native client
   */
  sdkConfigReactNative: {
    input: { index: 'src/index.native.ts' },
    output: [
      {
        dir: 'dist',
        format: 'es',
        sourcemap: true,
        entryFileNames: '[name].native.js'
      }
    ],
    plugins: [
      ignore(['graceful-fs', 'node-localstorage']),
      resolve({ extensions, preferBuiltins: true }),
      commonjs({ extensions }),
      alias({
        entries: [{ find: 'stream', replacement: 'stream-browserify' }]
      }),
      babel({ babelHelpers: 'bundled', extensions, plugins: [] }),
      json(),
      pluginTypescript
    ],
    external
  },

  /**
   * SDK Browser Package (ES Module + CommonJS)
   * Used by the Audius Web Client and by extension the Desktop Client
   * - Includes polyfills for node libraries
   * - Includes deps that are ignored or polyfilled for browser
   * The `.browser.cjs` output is resolved via the `browser`/`require`
   * condition in package.json#exports so bundlers operating in CJS mode get
   * the polyfilled build instead of the Node one.
   */
  sdkBrowserConfigEs: {
    input: 'src/index.ts',
    output: [
      {
        dir: 'dist',
        format: 'es',
        sourcemap: true,
        entryFileNames: '[name].browser.esm.js'
      },
      {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: '[name].browser.cjs',
        exports: 'named'
      }
    ],
    plugins: [
      ignore(['graceful-fs', 'node-localstorage']),
      resolve({ extensions, preferBuiltins: false }),
      commonjs({
        extensions,
        transformMixedEsModules: true
      }),
      alias({
        entries: [
          { find: 'stream', replacement: 'stream-browserify' },
          { find: 'crypto', replacement: 'crypto-browserify' }
        ]
      }),
      nodePolyfills(),
      babel({ babelHelpers: 'bundled', extensions }),
      json(),
      pluginTypescript,
      visualizer({
        filename: 'dist/sdk.browser.esm.html',
        template: 'sunburst'
      })
    ],
    external: external.filter((dep) => !browserInternal.includes(dep))
  },

  /**
   * SDK Browser Distributable
   * Meant to be used directly in the browser without any module resolver
   * - Includes polyfills for node libraries
   * - Includes all deps/dev deps
   */
  sdkBrowserDistConfig: {
    input: 'src/sdk/sdkBrowserDist.ts',
    output: [
      {
        file: 'dist/sdk.min.js',
        format: 'iife',
        esModule: false,
        sourcemap: true,
        plugins: [terser()],
        inlineDynamicImports: true
      }
    ],
    plugins: [
      ignore(['graceful-fs', 'node-localstorage']),
      resolve({ extensions, preferBuiltins: false, browser: true }),
      commonjs({
        extensions,
        transformMixedEsModules: true
      }),
      alias({
        entries: [
          { find: 'stream', replacement: 'stream-browserify' },
          { find: 'crypto', replacement: 'crypto-browserify' }
        ]
      }),
      nodePolyfills(),
      babel({
        babelHelpers: 'runtime',
        extensions,
        plugins: ['@babel/plugin-transform-runtime']
      }),
      json(),
      pluginTypescript
    ]
  }
}

export default Object.values(outputConfigs)
