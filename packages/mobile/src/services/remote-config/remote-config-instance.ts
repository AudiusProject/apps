import type { Environment } from '@audius/common/services'
import { remoteConfig } from '@audius/common/services'
import CodePush from '@bravemobile/react-native-code-push'
import * as optimizely from '@optimizely/optimizely-sdk'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import Config from 'react-native-config'
import VersionNumber from 'react-native-version-number'

import { env } from 'app/services/env'

import packageInfo from '../../../package.json'

export const FEATURE_FLAG_ASYNC_STORAGE_SESSION_KEY = 'featureFlagSessionId-2'

const { version: appVersion } = packageInfo

const OPTIMIZELY_KEY = env.OPTIMIZELY_KEY
const DATA_FILE_URL = 'https://experiments.audius.co/datafiles/%s.json'

/**
 * Sentinel returned when no OTA bundle is applied (the app is running its
 * embedded binary bundle). Lets Optimizely audiences target "native vs OTA"
 * without distinguishing missing data from a real value.
 */
const OTA_VERSION_NATIVE = 'native'

const getOtaVersion = async (): Promise<string> => {
  try {
    const pkg = await CodePush.getUpdateMetadata(CodePush.UpdateState.RUNNING)
    return pkg?.label ?? OTA_VERSION_NATIVE
  } catch {
    return OTA_VERSION_NATIVE
  }
}

const getMobileClientInfo = async () => {
  const mobilePlatform = Platform.OS
  const mobileAppVersion = VersionNumber.appVersion
  const otaVersion = await getOtaVersion()

  return {
    mobilePlatform,
    mobileAppVersion,
    otaVersion
  }
}

export const remoteConfigInstance = remoteConfig({
  appVersion,
  platform: 'mobile',
  getMobileClientInfo,
  createOptimizelyClient: async () => {
    return optimizely.createInstance({
      sdkKey: OPTIMIZELY_KEY,
      datafileOptions: {
        urlTemplate: DATA_FILE_URL
      },
      errorHandler: {
        handleError: (error) => {
          console.error(error)
        }
      }
    })
  },
  getFeatureFlagSessionId: async () => {
    const sessionId = await AsyncStorage.getItem(
      FEATURE_FLAG_ASYNC_STORAGE_SESSION_KEY
    )
    return sessionId ? parseInt(sessionId) : null
  },
  setFeatureFlagSessionId: async (id) =>
    AsyncStorage.setItem(FEATURE_FLAG_ASYNC_STORAGE_SESSION_KEY, id.toString()),
  setLogLevel: () => optimizely.setLogLevel('warn'),
  environment: Config.ENVIRONMENT as Environment
})

remoteConfigInstance.init()
