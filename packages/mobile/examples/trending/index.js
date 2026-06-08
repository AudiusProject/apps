// Import polyfills FIRST - before anything else (required for @audius/sdk in React Native)
// See: mobile-devkit apps/template-expo and apps/examples-expo for reference
import 'react-native-get-random-values'

// Polyfill Node.js globals for React Native (required by SDK and dependencies)
if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer
}
if (typeof global.process === 'undefined') {
  const processPolyfill = require('process/browser')
  global.process = processPolyfill
  if (!global.process.env) {
    global.process.env = {}
  }
  if (!global.process.nextTick) {
    global.process.nextTick = (callback) => {
      setTimeout(callback, 0)
    }
  }
}

if (typeof global.EventEmitter === 'undefined') {
  const { EventEmitter } = require('events')
  global.EventEmitter = EventEmitter
}

const util = require('util')
if (typeof util.inherits === 'undefined' && !global.util) {
  global.util = util
}

import { registerRootComponent } from 'expo'
import App from './App'

registerRootComponent(App)
