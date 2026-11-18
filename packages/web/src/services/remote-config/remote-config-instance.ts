import { remoteConfig } from '@audius/common/services'
import type { Config } from '@optimizely/optimizely-sdk'
import { isEmpty } from 'lodash'

import { env } from 'services/env'
import { isElectron } from 'utils/clientUtil'

import packageInfo from '../../../package.json'

const { version: appVersion } = packageInfo

declare global {
  interface Window {
    optimizelyDatafilePromise?: Promise<Config['datafile']>
  }
}

const FEATURE_FLAG_LOCAL_STORAGE_SESSION_KEY = 'featureFlagSessionId-2'

export const remoteConfigInstance = remoteConfig({
  appVersion,
  platform: isElectron() ? 'desktop' : 'web',
  createOptimizelyClient: async () => {
    // index.html starts the fetch so it runs alongside the entry bundle
    const datafile = (await window.optimizelyDatafilePromise) ?? {}
    if (isEmpty(datafile)) {
      console.error(new Error('Optimizely failed to load'))
    }

    // Loaded lazily so the SDK stays out of the entry chunk
    const { default: optimizely } = await import('@optimizely/optimizely-sdk')
    optimizely.setLogLevel('warn')
    return optimizely.createInstance({
      datafile,
      errorHandler: {
        handleError: (error) => {
          console.error(error)
        }
      }
    })
  },
  getFeatureFlagSessionId: async () => {
    const item = window.localStorage.getItem(
      FEATURE_FLAG_LOCAL_STORAGE_SESSION_KEY
    )
    return item ? parseInt(item) : null
  },
  setFeatureFlagSessionId: async (id: number) =>
    window.localStorage?.setItem(
      FEATURE_FLAG_LOCAL_STORAGE_SESSION_KEY,
      id.toString()
    ),
  // Log level is set in createOptimizelyClient once the SDK has loaded
  setLogLevel: () => {},
  environment: env.ENVIRONMENT
})
