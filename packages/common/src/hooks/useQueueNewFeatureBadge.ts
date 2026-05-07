import { useCallback, useEffect, useRef, useState } from 'react'

import { useDispatch } from 'react-redux'

import { useAppContext } from '~/context/appContext'
import { FeatureFlags } from '~/services/remote-config/feature-flags'

import { useFeatureFlag } from './useFeatureFlag'

const QUEUE_NEW_BADGE_DISMISSED_KEY = '@queue-new-feature-badge-dismissed'
// Mirrors the IDENTIFY action type in common/store/analytics/actions.
// Dispatching this triggers the analytics saga to forward traits to Amplitude
// as user properties, so the A/B variation can be sliced in Amplitude charts.
const ANALYTICS_IDENTIFY = 'ANALYTICS/IDENTIFY'

/**
 * Drives the "New" indicator on the play queue button.
 *
 * `showBadge` is true only when:
 *   1. Remote config feature flag is loaded AND enabled (treatment cohort), and
 *   2. The user has not dismissed the badge before (per local storage).
 *
 * `dismiss` permanently hides the badge for this user/device.
 */
export const useQueueNewFeatureBadge = () => {
  const { localStorage } = useAppContext()
  const { isLoaded, isEnabled } = useFeatureFlag(
    FeatureFlags.QUEUE_NEW_FEATURE_BADGE
  )
  const [hasDismissed, setHasDismissed] = useState<boolean | null>(null)
  const dispatch = useDispatch()
  const hasIdentifiedRef = useRef(false)

  useEffect(() => {
    if (!isLoaded || hasIdentifiedRef.current) return
    hasIdentifiedRef.current = true
    dispatch({
      type: ANALYTICS_IDENTIFY,
      traits: { queue_new_feature_badge: isEnabled ? 'on' : 'off' }
    })
  }, [isLoaded, isEnabled, dispatch])

  useEffect(() => {
    let cancelled = false
    const read = async () => {
      const value = await localStorage.getItem(QUEUE_NEW_BADGE_DISMISSED_KEY)
      if (!cancelled) {
        setHasDismissed(value === 'true')
      }
    }
    read()
    return () => {
      cancelled = true
    }
  }, [localStorage])

  const dismiss = useCallback(() => {
    if (hasDismissed) return
    setHasDismissed(true)
    localStorage.setItem(QUEUE_NEW_BADGE_DISMISSED_KEY, 'true')
  }, [hasDismissed, localStorage])

  const showBadge = Boolean(isLoaded && isEnabled && hasDismissed === false)

  return { showBadge, dismiss }
}
