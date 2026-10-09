const path = require('path')

// Resolve from this package so the mapping works whether npm hoists these to
// the repo root or keeps them under packages/mobile/node_modules.
const resolvePackageDir = (name) =>
  path.dirname(require.resolve(`${name}/package.json`, { paths: [__dirname] }))

module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  // A screen's first render loads its whole module tree, which can take
  // longer than the 5s default on CI runners.
  testTimeout: 30000,
  moduleNameMapper: {
    '^react-native$': resolvePackageDir('react-native'),
    '^@testing-library/react-native$': resolvePackageDir(
      '@testing-library/react-native'
    )
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-reanimated)/)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
}
