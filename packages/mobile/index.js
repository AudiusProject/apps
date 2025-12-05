/* eslint-disable import/first */
/* eslint-disable import/order */
// Import React first to ensure React internals are available
import React from 'react'
import 'react-native-gesture-handler'

// Import Reactotron in development mode only
if (__DEV__) {
  require('./ReactotronConfig')
}
// react-native has an issue with inverted lists on Android, and it got worse
// with Android 13. To avoid it we patch a react-native style, but that style
// got deprecated in React Native 0.70. For now the deprecation is limited to a
// JS runtime check, which we disable here.
import ViewReactNativeStyleAttributes from 'react-native/Libraries/Components/View/ReactNativeStyleAttributes'
ViewReactNativeStyleAttributes.scaleY = true
import { AppRegistry, LogBox, Text, TextInput } from 'react-native'
import TrackPlayer from 'react-native-track-player'
import { Crypto } from '@peculiar/webcrypto'

import { name as appName } from './app.json'

// Needed for TextEncoder to work correctly
import 'text-encoding-polyfill'

require('node-libs-react-native/globals')
// Needed for @solana/web3.js to run correctly
require('react-native-get-random-values')
require('react-native-url-polyfill/auto')

// Needed to support micro-aes-gcm which looks for WebCrypto's SubtleCrypto
global.crypto = new Crypto()

const { App } = require('./src/app')

// https://github.com/react-navigation/react-navigation/issues/9882
LogBox.ignoreLogs(['new NativeEventEmitter'])
// Ignore LogBox logs for preferred log messages in external
// React Native debug tools
LogBox.ignoreAllLogs()

// Prevent device font-scaling
Text.defaultProps = Text.defaultProps || {}
Text.defaultProps.allowFontScaling = false

TextInput.defaultProps = TextInput.defaultProps || {}
TextInput.defaultProps.allowFontScaling = false

AppRegistry.registerComponent(appName, () => App)
TrackPlayer.registerPlaybackService(() => require('./audio-service'))
