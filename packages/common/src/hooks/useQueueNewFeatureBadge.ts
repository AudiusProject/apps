import { useCallback, useEffect, useState } from 'react'

import { useAppContext } from '~/context/appContext'
import { FeatureFlags } from '~/services/remote-config/feature-flags'

import { useFeatureFlag } from './useFeatureFlag'

const QUEUE_NEW_BADGE_DISMISSED_KEY = '@queue-new-feature-badge-dismissed'

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
