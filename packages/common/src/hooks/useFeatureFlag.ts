import { useCallback, useEffect, useMemo, useState, useRef } from 'react'

import { useEffectOnce } from 'react-use'

import { useHasAccount } from '~/api'
import { useAppContext } from '~/context/appContext'
import { Maybe } from '~/utils/typeUtils'

import { FeatureFlags, RemoteConfigInstance } from '../services'

import { useHasConfigLoaded } from './helpers'

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

export const useRecomputeToggle = (configLoaded: boolean) => {
  const [recomputeToggle, setRecomputeToggle] = useState(0)
  const isInitialRender = useRef(true)
  const prevHasAccount = useRef<boolean | undefined>(undefined)
  const prevConfigLoaded = useRef<boolean | undefined>(undefined)

  const hasAccount = useHasAccount()

  // Flip recompute bool whenever account or config state changes
  useEffect(() => {
    // Skip the initial render to prevent unnecessary rerenders
    if (isInitialRender.current) {
      isInitialRender.current = false
      prevHasAccount.current = hasAccount
      prevConfigLoaded.current = configLoaded
      return
    }

    // Only increment if there's an actual change
    if (
      prevHasAccount.current !== hasAccount ||
      prevConfigLoaded.current !== configLoaded
    ) {
      setRecomputeToggle((recompute) => recompute + 1)
      prevHasAccount.current = hasAccount
      prevConfigLoaded.current = configLoaded
    }
  }, [hasAccount, configLoaded])

  return recomputeToggle
}

/**
 * @deprecated use `useFeatureFlag` instead
 * Hooks into updates for a given feature flag.
 * Returns both `isLoaded` and `isEnabled` for more granular control
 * @param flag
 */
export const createUseFeatureFlagHook =
  ({
    remoteConfigInstance,
    getLocalStorageItem,
    setLocalStorageItem,
    useHasConfigLoaded
  }: {
    remoteConfigInstance: RemoteConfigInstance
    getLocalStorageItem?: (key: string) => Promise<string | null>
    setLocalStorageItem?: (key: string, value: string | null) => Promise<void>
    useHasConfigLoaded: () => boolean
  }) =>
  (flag: FeatureFlags, fallbackFlag?: FeatureFlags) => {
    const overrideKey = `${FEATURE_FLAG_OVERRIDE_KEY}:${flag}`
    const configLoaded = useHasConfigLoaded()

    const shouldRecompute = useRecomputeToggle(configLoaded)

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
    const [hasReadOverride, setHasReadOverride] = useState(
      () => getLocalStorageItem == null
    )

    useEffectOnce(() => {
      if (!getLocalStorageItem) {
        return
      }
      const getOverride = async () => {
        try {
          const override = await getLocalStorageItem(overrideKey)
          if (override === 'enabled') {
            setIsLocallyOverriden(true)
          } else if (override === 'disabled') {
            setIsLocallyOverriden(false)
          }
        } finally {
          setHasReadOverride(true)
        }
      }
      getOverride().catch(() => {})
    })

    // Hard-code overrides, mobile only — see `HARDCODED_ENABLED_FLAGS` below.
    if (
      HARDCODED_ENABLED_FLAGS[flag] &&
      remoteConfigInstance.getPlatform() === 'mobile'
    ) {
      return {
        isLoaded: true,
        isEnabled: true,
        setOverride
      }
    }

    return {
      isLoaded: configLoaded && hasReadOverride,
      isEnabled: isLocallyEnabled ?? isEnabled,
      setOverride
    }
  }

/**
 * Mobile-only flags that are hard-coded to enabled (Optimizely, env defaults,
 * and local overrides are skipped on native). Web/desktop continue to honor
 * Optimizely and env defaults. Add entries only for short-lived release
 * toggles; remove when remote config is updated.
 */
const HARDCODED_ENABLED_FLAGS: Partial<Record<FeatureFlags, true>> = {}

/** Fetches enabled status of a given feature flag with fallback. Result is memoized. */
export const useFeatureFlag = (
  flag: FeatureFlags,
  fallbackFlag?: FeatureFlags
) => {
  const overrideKey = `${FEATURE_FLAG_OVERRIDE_KEY}:${flag}`
  const configLoaded = useHasConfigLoaded()
  const { localStorage, remoteConfig } = useAppContext()

  const shouldRecompute = useRecomputeToggle(configLoaded)

  const isEnabled = useMemo(
    () => remoteConfig.getFeatureEnabled(flag, fallbackFlag),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flag, fallbackFlag, shouldRecompute]
  )

  const setOverride = useCallback(
    async (value: OverrideSetting) => {
      return value === null
        ? localStorage.removeItem(overrideKey)
        : localStorage.setItem(overrideKey, value)
    },
    [overrideKey, localStorage]
  )

  const [isLocallyEnabled, setIsLocallyOverriden] = useState<Maybe<boolean>>()
  const [hasReadOverride, setHasReadOverride] = useState(false)

  useEffectOnce(() => {
    const getOverride = async () => {
      try {
        const override = await localStorage.getItem(overrideKey)
        if (override === 'enabled') {
          setIsLocallyOverriden(true)
        } else if (override === 'disabled') {
          setIsLocallyOverriden(false)
        }
      } finally {
        setHasReadOverride(true)
      }
    }
    getOverride().catch(() => {})
  })

  if (
    HARDCODED_ENABLED_FLAGS[flag] &&
    remoteConfig.getPlatform() === 'mobile'
  ) {
    return {
      isLoaded: true,
      isEnabled: true,
      setOverride
    }
  }

  return {
    isLoaded: configLoaded && hasReadOverride,
    isEnabled: isLocallyEnabled ?? isEnabled,
    setOverride
  }
}
