const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

/**
 * Metro config scoped to this example so the parent app's metro.config.js
 * (packages/mobile) is not used. That parent config would pull in the main
 * app's entry and babel aliases, breaking resolution.
 */
const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../../../../')
const sdkPath = path.resolve(monorepoRoot, 'packages/sdk')
const sdkSourcePath = path.resolve(sdkPath, 'src/index.ts')
const packagesPath = path.resolve(monorepoRoot, 'packages')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [
  projectRoot,
  sdkPath,
  packagesPath,
  path.resolve(monorepoRoot, 'node_modules')
]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules')
]
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@audius/sdk': path.resolve(sdkPath, 'src/index.ts'),
  '@audius/fixed-decimal': path.resolve(packagesPath, 'fixed-decimal'),
  '@audius/eth': path.resolve(packagesPath, 'eth'),
  '@audius/spl': path.resolve(packagesPath, 'spl'),
  crypto: require.resolve('expo-crypto'),
  fs: path.resolve(projectRoot, 'polyfills/fs.js'),
  stream: require.resolve('stream-browserify'),
  util: require.resolve('util'),
  buffer: require.resolve('buffer'),
  process: require.resolve('process/browser'),
  path: require.resolve('path-browserify'),
  os: require.resolve('os-browserify/browser'),
  events: require.resolve('events'),
  url: require.resolve('url'),
  querystring: require.resolve('querystring-es3')
}
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@audius/sdk') {
    return { filePath: sdkSourcePath, type: 'sourceFile' }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
