import { FEATURE_FLAG_OVERRIDE_KEY } from '@audius/common/hooks'
import type { OverrideSetting } from '@audius/common/hooks'
import type { FeatureFlags } from '@audius/common/services'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { remoteConfigInstance } from './remote-config-instance'

const getLocalStorageItem = (key: string) => AsyncStorage.getItem(key)

const getFlagEnabled = async (flag: FeatureFlags) => {
  const overrideKey = `${FEATURE_FLAG_OVERRIDE_KEY}:${flag}`
  const override = (await getLocalStorageItem?.(overrideKey)) as OverrideSetting
  if (override === 'enabled') return true
  if (override === 'disabled') return false

  return remoteConfigInstance.getFeatureEnabled(flag)
}

export const getFeatureEnabled = async (
  flag: FeatureFlags,
  fallbackFlag?: FeatureFlags
) => {
  return (
    ((await getFlagEnabled(flag)) ||
      (fallbackFlag && (await getFlagEnabled(fallbackFlag)))) ??
    false
  )
}
