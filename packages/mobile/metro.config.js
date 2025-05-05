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
    unstable_enablePackageExports: true,
    unstable_conditionNames: ['default', 'require', 'react-native'],
    assetExts: [...assetExts.filter((ext) => ext !== 'svg'), 'lottie'],
    sourceExts: [...sourceExts, 'svg', 'cjs', 'workerscript'],
    extraNodeModules: {
      ...require('node-libs-react-native'),

      // Alias for 'src' to allow for absolute paths
      app: path.resolve(__dirname, 'src'),
      '@audius/harmony-native': path.resolve(__dirname, 'src/harmony-native'),
      '~': path.resolve(__dirname, '../common/src'),
      '~harmony': path.resolve(__dirname, '../harmony/src'),

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

      return context.resolveRequest(context, moduleName, platform)
    }
  },
  maxWorkers: 2
}

const mergedConfig = mergeConfig(defaultConfig, config)

if (process.env.RN_STORYBOOK) {
  mergedConfig.resolver.resolverMainFields.unshift('sbmodern')
}

if (process.env.RN_E2E)
  mergedConfig.resolver.sourceExts = ['e2e.ts', ...config.resolver.sourceExts]

module.exports = mergedConfig
