/* eslint-disable import/first */
/* eslint-disable import/order */
require('./src/utils/hermes-error-stack-polyfill').applyHermesErrorStackPolyfill()

import React from 'react'
import 'react-native-gesture-handler'

if (__DEV__) {
  require('./ReactotronConfig')
}
import ViewReactNativeStyleAttributes from 'react-native/Libraries/Components/View/ReactNativeStyleAttributes'
ViewReactNativeStyleAttributes.scaleY = true
import { AppRegistry, LogBox, Text, TextInput } from 'react-native'
import TrackPlayer from 'react-native-track-player'
import {
  getMessaging,
  setBackgroundMessageHandler
} from '@react-native-firebase/messaging'

import { name as appName } from './app.json'

import 'text-encoding-polyfill'

require('node-libs-react-native/globals')
require('react-native-get-random-values')
require('react-native-url-polyfill/auto')

require('./src/utils/webCrypto/subtleCrypto').installSubtleCrypto()

const App = require('./src/app/ota-root').default

LogBox.ignoreLogs(['new NativeEventEmitter'])
LogBox.ignoreAllLogs()

Text.defaultProps = Text.defaultProps || {}
Text.defaultProps.allowFontScaling = false

TextInput.defaultProps = TextInput.defaultProps || {}
TextInput.defaultProps.allowFontScaling = false

AppRegistry.registerComponent(appName, () => App)
TrackPlayer.registerPlaybackService(() => require('./audio-service'))
setBackgroundMessageHandler(getMessaging(), async () => {})
