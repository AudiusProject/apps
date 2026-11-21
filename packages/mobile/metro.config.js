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

const strippedBip39Wordlist = path.resolve(
  __dirname,
  'src/shims/stripped-bip39-wordlist.js'
)
const resolveStrippedBip39Wordlist = (moduleName, originModulePath) => {
  const scure = moduleName.match(/^@scure\/bip39\/wordlists\/([\w-]+?)(\.js)?$/)
  if (scure && scure[1] !== 'english') return { type: 'empty' }
  const legacy = moduleName.match(/^\.\/wordlists\/(\w+)\.json$/)
  if (
    legacy &&
    legacy[1] !== 'english' &&
    /[/\\]bip39[/\\]src[/\\]/.test(originModulePath ?? '')
  ) {
    return { filePath: strippedBip39Wordlist, type: 'sourceFile' }
  }
  return null
}

const rootModules = path.resolve(__dirname, '../../node_modules')
const canonicalPackages = {
  '@noble/curves': `${rootModules}/@solana/wallet-standard-util/node_modules/@noble/curves`,
  '@noble/ciphers': path.resolve(
    __dirname,
    '../common/node_modules/@noble/ciphers'
  ),
  '@babel/runtime': path.resolve(
    __dirname,
    '../web/node_modules/@babel/runtime'
  ),
  buffer: path.resolve(__dirname, 'node_modules/buffer'),
  color: path.resolve(__dirname, 'node_modules/color'),
  'react-use': `${rootModules}/react-use`,
  semver: `${rootModules}/@bravemobile/react-native-code-push/node_modules/semver`,
  uuid: `${rootModules}/jayson/node_modules/uuid`
}
const majorVersions = new Map()
const getMajorVersion = (packageDir) => {
  if (!majorVersions.has(packageDir)) {
    let major = null
    try {
      const { version } = JSON.parse(
        fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')
      )
      major = version.split('.')[0]
    } catch {}
    majorVersions.set(packageDir, major)
  }
  return majorVersions.get(packageDir)
}
const dedupedPackagePattern = new RegExp(
  `^(.*[/\\\\]node_modules[/\\\\](${Object.keys(canonicalPackages)
    .map((name) => name.replace('/', '[/\\\\]'))
    .join('|')}))([/\\\\].*)$`
)
const dedupeResolution = (resolution) => {
  if (resolution?.type !== 'sourceFile') return resolution
  const match = resolution.filePath.match(dedupedPackagePattern)
  if (!match) return resolution
  const [, packageDir, name, rest] = match
  const canonicalDir = canonicalPackages[name.replace('\\', '/')]
  if (packageDir === canonicalDir) return resolution
  const major = getMajorVersion(canonicalDir)
  if (!major || getMajorVersion(packageDir) !== major) return resolution
  const filePath = canonicalDir + rest
  return fs.existsSync(filePath) ? { ...resolution, filePath } : resolution
}

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
        if (req.url === '/status') {
          res.writeHead(200, { 'Content-Type': 'text/plain' })
          res.end('packager-status:running')
          return
        }
        const userAgent = req.headers['user-agent'] || ''
        const isAndroid =
          userAgent.includes('Android') || userAgent.includes('okhttp')
        if (isAndroid) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
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

      app: path.resolve(__dirname, 'src'),
      '@audius/harmony-native': path.resolve(__dirname, 'src/harmony-native'),
      '~': path.resolve(__dirname, '../common/src'),
      '~harmony': path.resolve(__dirname, '../harmony/src'),
      '@audius/sdk': path.resolve(__dirname, '../sdk/src/index.ts'),
      '@audius/fixed-decimal': path.resolve(
        __dirname,
        '../fixed-decimal/src/index.ts'
      ),
      '@audius/spl': path.resolve(__dirname, '../spl/src/index.ts'),
      '@audius/eth': path.resolve(__dirname, '../eth/src/index.ts'),

      'react-redux': resolveModule('react-redux'),
      'react-native-svg': path.resolve(
        __dirname,
        './node_modules',
        'react-native-svg'
      ),
      'react-native-reanimated': resolveModule('react-native-reanimated'),
      'react-native-worklets': resolveModule('react-native-worklets'),
      'react-native-gesture-handler': path.resolve(
        __dirname,
        './node_modules',
        'react-native-gesture-handler'
      ),

      react: resolveModule('react'),
      'react-native': resolveModule('react-native'),

      ...getClientAliases(),

      crypto: path.resolve(__dirname, 'src/shims/crypto.js'),
      child_process: emptyPolyfill,
      fs: resolveModule('@dr.pogodin/react-native-fs'),
      net: emptyPolyfill,
      tls: resolveModule('tls-browserify')
    },
    resolveRequest: (context, moduleName, platform) =>
      dedupeResolution(resolveRequest(context, moduleName, platform))
  },
  maxWorkers: 2
}

function resolveRequest(context, moduleName, platform) {
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

  const strippedWordlist = resolveStrippedBip39Wordlist(
    moduleName,
    context.originModulePath
  )
  if (strippedWordlist) return strippedWordlist

  if (moduleName === 'react-router') {
    return {
      filePath: path.resolve(__dirname, 'src/shims/react-router.ts'),
      type: 'sourceFile'
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

  if (moduleName === '@audius/spl') {
    return {
      filePath: path.resolve(__dirname, '../spl/src/index.ts'),
      type: 'sourceFile'
    }
  }

  if (moduleName === '@audius/eth') {
    return {
      filePath: path.resolve(__dirname, '../eth/src/index.ts'),
      type: 'sourceFile'
    }
  }

  return context.resolveRequest(context, moduleName, platform)
}

const mergedConfig = mergeConfig(defaultConfig, config)

module.exports = mergedConfig
