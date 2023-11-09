import { useCallback, useEffect, useMemo, useState } from 'react'

import { useEffectOnce } from 'react-use'

import { Maybe } from 'utils/typeUtils'

import { FeatureFlags, RemoteConfigInstance } from '../services'

export const FEATURE_FLAG_OVERRIDE_KEY = 'FeatureFlagOverride'

export type OverrideSetting = 'enabled' | 'disabled' | null

/**
 * Helper for when to recompute flag state, used by both FeatureFlags
 * and RemoteConfig. Returns a boolean that toggles whenever it should recompute (i.e. for use in `useEffect`)
 * Recomputes when:
 * - User logs in (account is seen in store)
 * - Config loads
 * - User ID is set on Optimizely (seen by event emission)
 **/
export const useRecomputeToggle = (
  useHasAccount: () => boolean,
  configLoaded: boolean,
  remoteConfigInstance: RemoteConfigInstance
) => {
  const [recomputeToggle, setRecomputeToggle] = useState(0)

  const hasAccount = useHasAccount()

  // Flip recompute bool whenever account or config state changes
  useEffect(() => {
    setRecomputeToggle((recompute) => recompute + 1)
  }, [hasAccount, configLoaded])

  // Register callback for remote config account set,
  // which flips recompute bool
  const onUserStateChange = useCallback(() => {
    setRecomputeToggle((recompute) => recompute + 1)
  }, [])

  useEffect(() => {
    remoteConfigInstance.listenForUserId(onUserStateChange)
    return () => remoteConfigInstance.unlistenForUserId(onUserStateChange)
  }, [onUserStateChange, remoteConfigInstance])

  return recomputeToggle
}

/**
 * Hooks into updates for a given feature flag.
 * Returns both `isLoaded` and `isEnabled` for more granular control
 * @param flag
 */
export const createUseFeatureFlagHook =
  ({
    remoteConfigInstance,
    getLocalStorageItem,
    setLocalStorageItem,
    useHasAccount,
    useHasConfigLoaded
  }: {
    remoteConfigInstance: RemoteConfigInstance
    getLocalStorageItem?: (key: string) => Promise<string | null>
    setLocalStorageItem?: (key: string, value: string | null) => Promise<void>
    useHasAccount: () => boolean
    useHasConfigLoaded: () => boolean
  }) =>
  (flag: FeatureFlags, fallbackFlag?: FeatureFlags) => {
    const overrideKey = `${FEATURE_FLAG_OVERRIDE_KEY}:${flag}`
    const configLoaded = useHasConfigLoaded()

    const shouldRecompute = useRecomputeToggle(
      useHasAccount,
      configLoaded,
      remoteConfigInstance
    )

    const isEnabled = useMemo(
      () => remoteConfigInstance.getFeatureEnabled(flag, fallbackFlag),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [flag, fallbackFlag, shouldRecompute]
    )

    const setOverride = useCallback(
      async (value: OverrideSetting) => {
        await setLocalStorageItem?.(overrideKey, value)
      },
      [overrideKey]
    )

    const [isLocallyEnabled, setIsLocallyOverriden] = useState<Maybe<boolean>>()

    useEffectOnce(() => {
      const getOverride = async () => {
        const override = await getLocalStorageItem?.(overrideKey)
        if (override === 'enabled') {
          setIsLocallyOverriden(true)
        }
        if (override === 'disabled') {
          setIsLocallyOverriden(false)
        }

        return undefined
      }
      getOverride()
    })

    return {
      isLoaded: configLoaded,
      isEnabled: isLocallyEnabled ?? isEnabled,
      setOverride
    }
  }
