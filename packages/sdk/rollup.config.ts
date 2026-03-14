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

/**
 * ES-only dependencies need inlining when outputting a Common JS bundle,
 * as requiring ES modules from Common JS isn't supported.
 * Alternatively, these modules could be imported using dynamic imports,
 * but that would have other side effects and affect each bundle output
 * vs only affecting Common JS outputs, and requires Rollup 3.0.
 *
 * TODO: Make a test to ensure we don't add external ES-only modules to Common JS output
 *
 * See:
 * - https://nodejs.org/api/esm.html#interoperability-with-commonjs
 * - https://github.com/rollup/plugins/issues/481#issuecomment-661622792
 * - https://github.com/rollup/rollup/pull/4647 (3.0 supports keeping dynamic imports)
 */
const commonJsInternal = ['micro-aes-gcm']

export const outputConfigs = {
  /**
   * SDK (and Libs) Node Package (Common JS)
   * Used by the Audius Content Node Service and Identity Service
   * - Includes libs
   * - Makes external ES modules internal to prevent issues w/ using require()
   */
  sdkConfigCjs: {
    input: 'src/index.ts',
    output: [
      {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: '[name].cjs.js'
      }
    ],
    plugins: [
      resolve({ extensions, preferBuiltins: true }),
      commonjs({ extensions }),
      babel({ babelHelpers: 'bundled', extensions }),
      json(),
      pluginTypescript
    ],
    external: external.filter((id) => !commonJsInternal.includes(id))
  },

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
    input: 'src/index.native.ts',
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
   * SDK Browser Package (Common JS)
   * Possibly used by third parties
   * - Includes polyfills for node libraries
   * - Includes deps that are ignored or polyfilled for browser
   * - Makes external ES modules internal to prevent issues w/ using require()
   */
  sdkBrowserConfigCjs: {
    input: 'src/sdk/index.ts',
    output: [
      {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: '[name].browser.cjs.js'
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
      pluginTypescript
    ],
    external: external.filter(
      (dep) => !browserInternal.includes(dep) && !commonJsInternal.includes(dep)
    )
  },

  /**
   * SDK Browser Package (ES Module)
   * Used by the Audius Web Client and by extension the Desktop Client
   * - Includes polyfills for node libraries
   * - Includes deps that are ignored or polyfilled for browser
   */
  sdkBrowserConfigEs: {
    input: 'src/sdk/index.ts',
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
