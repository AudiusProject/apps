const path = require('path')

const resolvePackageDir = (name) =>
  path.dirname(require.resolve(`${name}/package.json`, { paths: [__dirname] }))

module.exports = {
  preset: 'react-native',
  resolver: 'react-native-worklets/jest/resolver',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
  moduleNameMapper: {
    '^react-native$': resolvePackageDir('react-native'),
    '^@testing-library/react-native$': resolvePackageDir(
      '@testing-library/react-native'
    )
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-reanimated|react-native-worklets|@shopify/flash-list)/)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
}
