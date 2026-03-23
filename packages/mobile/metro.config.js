const fs = require('fs')
const path = require('path')

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')

const defaultConfig = getDefaultConfig(__dirname)
const {
  resolver: { sourceExts, assetExts }
} = defaultConfig

const clientPath = path.resolve(__dirname, '../web')
const commonPath = path.resolve(__dirname, '../../packages/common')
const harmonyPath = path.resolve(__dirname, '../../packages/harmony')
const splPath = path.resolve(__dirname, '../../packages/spl')
const sdkPath = path.resolve(__dirname, '../../packages/sdk')
const ethPath = path.resolve(__dirname, '../../packages/eth')
const emptyPolyfill = path.resolve(__dirname, 'src/mocks/empty.ts')
const fixedDecimalPath = path.resolve(__dirname, '../../packages/fixed-decimal')

const resolveModule = (module) =>
  path.resolve(__dirname, '../../node_modules', module)

const getClientAliases = () => {
  const clientAbsolutePaths = [
    'assets',
    'audio',
    'common',
    'pages',
    'models',
    'schemas',
    'services',
    'store',
    'utils',
    'workers'
  ]

  return clientAbsolutePaths.reduce(
    (clientPaths, currentPath) => ({
      [currentPath]: path.resolve(clientPath, 'src', currentPath),
      ...clientPaths
    }),
    {}
  )
}

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  server: {
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Android dev check expects this exact string for /status endpoint
        if (req.url === '/status') {
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end('packager-status:running')
          return
        }
        // Handle CORS for Android requests in React Native 0.78
        const userAgent = req.headers['user-agent'] || ''
        const isAndroid =
          userAgent.includes('Android') || userAgent.includes('okhttp')
        if (isAndroid) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          // Handle OPTIONS preflight requests
          if (req.method === 'OPTIONS') {
            res.writeHead(200)
            res.end()
            return
          }
        }
        return middleware(req, res, next)
      }
    }
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: true,
        inlineRequires: true
      }
    }),
    babelTransformerPath: require.resolve('react-native-svg-transformer')
  },
  watchFolders: [
    path.resolve(__dirname, '../../node_modules'),
    clientPath,
    commonPath,
    harmonyPath,
    sdkPath,
    ethPath,
    fixedDecimalPath,
    splPath
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules')
    ],
    unstable_enablePackageExports: false,
    unstable_conditionNames: ['default', 'require', 'react-native'],
    assetExts: [...assetExts.filter((ext) => ext !== 'svg'), 'lottie'],
    sourceExts: [...sourceExts, 'svg', 'cjs', 'mjs', 'workerscript'],
    extraNodeModules: {
      ...require('node-libs-react-native'),

      // Alias for 'src' to allow for absolute paths
      app: path.resolve(__dirname, 'src'),
      '@audius/harmony-native': path.resolve(__dirname, 'src/harmony-native'),
      '~': path.resolve(__dirname, '../common/src'),
      '~harmony': path.resolve(__dirname, '../harmony/src'),
      '@audius/sdk': path.resolve(__dirname, '../sdk/src/index.ts'),
      // Like SDK: bundle from source; package.json main points at dist/.
      '@audius/fixed-decimal': path.resolve(
        __dirname,
        '../fixed-decimal/src/index.ts'
      ),

      // The following imports are needed for @audius/common
      // and @audius/web to compile correctly
      'react-redux': resolveModule('react-redux'),
      'react-native-svg': path.resolve(
        __dirname,
        './node_modules',
        'react-native-svg'
      ),
      'react-native-reanimated': path.resolve(
        __dirname,
        './node_modules',
        'react-native-reanimated'
      ),
      'react-native-gesture-handler': path.resolve(
        __dirname,
        './node_modules',
        'react-native-gesture-handler'
      ),

      react: resolveModule('react'),
      'react-native': path.resolve(__dirname, './node_modules', 'react-native'),

      // Aliases for '@audius/web' to allow for absolute paths
      ...getClientAliases(),

      // Various polyfills to enable @audius/sdk to run in react-native
      child_process: emptyPolyfill,
      fs: resolveModule('react-native-fs'),
      net: emptyPolyfill,
      tls: resolveModule('tls-browserify')
    },
    resolveRequest: (context, moduleName, platform) => {
      // TS packages often use NodeNext-style `./file.js` in source; Metro looks for
      // that path literally. If only `./file.ts` exists, resolve to it.
      if (
        moduleName.startsWith('.') &&
        moduleName.endsWith('.js') &&
        context.originModulePath
      ) {
        const fromDir = path.dirname(context.originModulePath)
        const candidateJs = path.resolve(fromDir, moduleName)
        if (!fs.existsSync(candidateJs)) {
          const base = candidateJs.replace(/\.js$/, '')
          const candidateTs = `${base}.ts`
          const candidateTsx = `${base}.tsx`
          if (fs.existsSync(candidateTs)) {
            return { filePath: candidateTs, type: 'sourceFile' }
          }
          if (fs.existsSync(candidateTsx)) {
            return { filePath: candidateTsx, type: 'sourceFile' }
          }
        }
      }

      if (moduleName === 'react') {
        return {
          filePath: `${resolveModule('react')}/index.js`,
          type: 'sourceFile'
        }
      }

      if (moduleName === 'react-redux') {
        return {
          filePath: `${resolveModule('react-redux')}/lib/index.js`,
          type: 'sourceFile'
        }
      }

      if (moduleName === '@metaplex-foundation/umi/serializers') {
        return {
          filePath: `${resolveModule(
            '@metaplex-foundation/umi'
          )}/dist/cjs/serializers.cjs`,
          type: 'sourceFile'
        }
      }

      if (moduleName === 'react-merge-refs') {
        return {
          filePath: `${resolveModule('react-merge-refs')}/dist/index.mjs`,
          type: 'sourceFile'
        }
      }

      if (moduleName === '@audius/sdk') {
        return {
          filePath: path.resolve(__dirname, '../sdk/src/index.ts'),
          type: 'sourceFile'
        }
      }

      if (moduleName === '@audius/fixed-decimal') {
        return {
          filePath: path.resolve(__dirname, '../fixed-decimal/src/index.ts'),
          type: 'sourceFile'
        }
      }

      return context.resolveRequest(context, moduleName, platform)
    }
  },
  maxWorkers: 2
}

const mergedConfig = mergeConfig(defaultConfig, config)

module.exports = mergedConfig
