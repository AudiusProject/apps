module.exports = {
  testMatch: ['<rootDir>/src/components/navigation-container/**/*.test.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  transformIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^react-native/(.*)$': '<rootDir>/__mocks__/react-native.js',
    '^~/(.*)$': '<rootDir>/src/$1',
    '^app/(.*)$': '<rootDir>/src/$1',
    '^@audius/sdk$': '<rootDir>/../sdk/src',
    '^@audius/sdk/(.*)$': '<rootDir>/../sdk/src/$1'
  }
}

