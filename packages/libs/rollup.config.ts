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

const commonJsInternal = ['micro-aes-gcm', '@audius/sdk']

export const outputConfigs = {
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
