import { useCallback, useEffect, useMemo, useState, useRef } from 'react'

import { useEffectOnce } from 'react-use'

import { useHasAccount } from '~/api'
import { useAppContext } from '~/context/appContext'
import { Maybe } from '~/utils/typeUtils'

import { FeatureFlags, RemoteConfigInstance } from '../services'

import { useHasConfigLoaded } from './helpers'

export const FEATURE_FLAG_OVERRIDE_KEY = 'FeatureFlagOverride'

export type OverrideSetting = 'enabled' | 'disabled' | null

export const useRecomputeToggle = (configLoaded: boolean) => {
  const [recomputeToggle, setRecomputeToggle] = useState(0)
  const isInitialRender = useRef(true)
  const prevHasAccount = useRef<boolean | undefined>(undefined)
  const prevConfigLoaded = useRef<boolean | undefined>(undefined)

  const hasAccount = useHasAccount()

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      prevHasAccount.current = hasAccount
      prevConfigLoaded.current = configLoaded
      return
    }

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

const HARDCODED_ENABLED_FLAGS: Partial<Record<FeatureFlags, true>> = {}

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
