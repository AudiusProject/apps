// Jest config scoped to the embed package's unit tests.
// Babel presets are declared inline here (rather than a root babel.config.js)
// so the Vite/esbuild build pipeline is unaffected.
module.exports = {
  testEnvironment: 'node',
  // BedtimeClient touches `window` at import time; jest.setup provides a shim
  // (the hoisted jsdom environment is an incompatible version in this repo).
  setupFiles: ['<rootDir>/jest.setup.cjs'],
  transform: {
    '^.+\\.(js|jsx)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-react', { runtime: 'automatic' }]
        ]
      }
    ]
  }
}
