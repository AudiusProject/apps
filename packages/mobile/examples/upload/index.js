// Import polyfills FIRST - before anything else (required for @audius/sdk in React Native)
import 'react-native-get-random-values'

if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer
}
if (typeof global.process === 'undefined') {
  const processPolyfill = require('process/browser')
  global.process = processPolyfill
  if (!global.process.env) global.process.env = {}
  if (!global.process.nextTick) {
    global.process.nextTick = (cb) => setTimeout(cb, 0)
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
