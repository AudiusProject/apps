/**
 * Root component wrapped with CodePush for over-the-air updates.
 * Used as the app entry when OTA is enabled; falls back to plain App when not.
 */

import CodePush from '@bravemobile/react-native-code-push'

import { App } from './App'
import { releaseHistoryFetcher } from './ota-updates'

const codePushOptions = {
  checkFrequency: CodePush.CheckFrequency.ON_APP_RESUME as const,
  releaseHistoryFetcher
}

export default CodePush(codePushOptions)(App)
