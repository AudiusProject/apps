import alias from '@rollup/plugin-alias'
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import ignore from 'rollup-plugin-ignore'

import pkg from './package.json'

const extensions = ['.js', '.ts']

const external = [
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.devDependencies),
  'ethers/lib/utils',
  'ethers/lib/index',
  'hashids/cjs',
  'readable-stream',
  'debug'
]

const pluginTypescript = typescript({ tsconfig: './tsconfig.json' })

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
const commonJsInternal = ['micro-aes-gcm', '@audius/sdk']

export const outputConfigs = {
  /**
   * Libs Node Package (Common JS)
   * Used by the Identity Service
   * - Makes external ES modules internal to prevent issues w/ using require()
   */
  libsConfigCjs: {
    input: 'src/libs.ts',
    output: [
      {
        dir: 'dist',
        format: 'cjs',
        sourcemap: true,
        entryFileNames: '[name].js'
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
   * Libs Web Package
   * Used by the Audius Web Client as a more performant/smaller bundle
   */
  webConfig: {
    input: 'src/web-libs.ts',
    output: [
      {
        dir: 'dist',
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [
      ignore(['web3', 'graceful-fs', 'node-localstorage']),
      resolve({ extensions, preferBuiltins: true }),
      commonjs({ extensions }),
      alias({
        entries: [{ find: 'stream', replacement: 'stream-browserify' }]
      }),
      babel({ babelHelpers: 'bundled', extensions }),
      json(),
      pluginTypescript
    ],
    external
  },

  /**
   * Libs Legacy React Native Package
   * Used by the Audius React Native Client
   * - Includes a modified version of AudiusLibs with Solana dependencies removed
   */
  legacyReactNativeConfig: {
    input: 'src/native-libs.ts',
    output: [{ dir: 'dist', format: 'es', sourcemap: true }],
    plugins: [
      ignore(['web3', 'graceful-fs', 'node-localstorage']),
      resolve({ extensions, preferBuiltins: true }),
      commonjs({ extensions }),
      alias({
        entries: [{ find: 'stream', replacement: 'stream-browserify' }]
      }),
      babel({ babelHelpers: 'bundled', extensions }),
      json(),
      pluginTypescript
    ],
    external
  },

  /**
   * Core Package
   * Exports a small bundle that can be loaded quickly, useful for eager requests
   */
  coreConfig: {
    input: 'src/core.ts',
    output: [{ dir: 'dist', format: 'es', sourcemap: true }],
    plugins: [
      resolve({ extensions, preferBuiltins: true }),
      commonjs({ extensions }),
      babel({ babelHelpers: 'bundled', extensions }),
      json(),
      pluginTypescript
    ],
    external
  }
}

export default Object.values(outputConfigs)
