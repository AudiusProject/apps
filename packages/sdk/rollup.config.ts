import alias from '@rollup/plugin-alias'
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import ignore from 'rollup-plugin-ignore'
import nodePolyfills from 'rollup-plugin-polyfill-node'
import { terser } from 'rollup-plugin-terser'
import { visualizer } from 'rollup-plugin-visualizer'

import pkg from './package.json'

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
   * SDK Node Package (ES Module)
   * Used by third parties using ES Modules
   */
  sdkConfigEs: {
    input: 'src/index.ts',
    output: [
      {
        dir: 'dist',
        format: 'es',
        sourcemap: true,
        entryFileNames: '[name].esm.js'
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
   * SDK Browser Package (ES Module)
   * Used by the Audius Web Client and by extension the Desktop Client
   * - Includes polyfills for node libraries
   * - Includes deps that are ignored or polyfilled for browser
   */
  sdkBrowserConfigEs: {
    input: 'src/index.ts',
    output: [
      {
        dir: 'dist',
        format: 'es',
        sourcemap: true,
        entryFileNames: '[name].browser.esm.js'
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
   * Full SDK Node Package (ES Module)
   * Includes createSdkWithServices, all services, Solana programs, etc.
   * Used by internal consumers (web, mobile, commands) via @audius/sdk/full
   */
  sdkFullConfigEs: {
    input: 'src/full.ts',
    output: [
      {
        dir: 'dist',
        format: 'es',
        sourcemap: true,
        entryFileNames: 'full.esm.js'
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
   * Full SDK React Native Package
   * Used by the Audius React Native client via @audius/sdk/full
   */
  sdkFullConfigReactNative: {
    input: { full: 'src/full.native.ts' },
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
   * Full SDK Browser Package (ES Module)
   * Used by the Audius Web Client via @audius/sdk/full
   */
  sdkFullBrowserConfigEs: {
    input: 'src/full.ts',
    output: [
      {
        dir: 'dist',
        format: 'es',
        sourcemap: true,
        entryFileNames: 'full.browser.esm.js'
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
        filename: 'dist/sdk.full.browser.esm.html',
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
