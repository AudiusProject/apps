import {
  OverrideSetting,
  FEATURE_FLAG_OVERRIDE_KEY
} from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'

import { remoteConfigInstance } from './remote-config-instance'

const getLocalStorageItem = (key: string) =>
  typeof window !== 'undefined' ? window.localStorage.getItem(key) : null

const getFlagEnabled = (flag: FeatureFlags) => {
  const overrideKey = `${FEATURE_FLAG_OVERRIDE_KEY}:${flag}`
  const override = getLocalStorageItem?.(overrideKey) as OverrideSetting

  if (override === 'enabled') return true
  if (override === 'disabled') return false

  return remoteConfigInstance.getFeatureEnabled(flag)
}

export const getFeatureEnabled = (
  flag: FeatureFlags,
  fallbackFlag?: FeatureFlags
) => {
  return (
    (getFlagEnabled(flag) || (fallbackFlag && getFlagEnabled(fallbackFlag))) ??
    false
  )
}
