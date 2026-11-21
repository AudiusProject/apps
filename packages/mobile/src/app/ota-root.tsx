import CodePush from '@bravemobile/react-native-code-push'

import { App } from './App'
import { releaseHistoryFetcher } from './ota-updates'

const codePushOptions = {
  checkFrequency: CodePush.CheckFrequency.ON_APP_RESUME as const,
  releaseHistoryFetcher
}

export default CodePush(codePushOptions)(App)
