import { useCallback, useEffect, useState } from 'react'

import { useAppContext } from '~/context/appContext'
import { FeatureFlags } from '~/services/remote-config/feature-flags'

import { useFeatureFlag } from './useFeatureFlag'

const QUEUE_NEW_BADGE_DISMISSED_KEY = '@queue-new-feature-badge-dismissed'

/**
 * Drives the "New" indicator on the play queue button and tracks first-open
 * cohort attribution for A/B analysis.
 *
 * `showBadge` — true only for treatment cohort before their first open.
 * `isFirstOpen` — true until the user opens the queue for the first time ever.
 *   null while the localStorage read is in-flight.
 * `isEnabled` — whether the user is in the treatment cohort (flag on).
 * `dismiss` — permanently marks "first open done"; safe to call for both
 *   treatment and control so the analytics property is only sent once.
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
  // hasDismissed === false means "read from storage and not yet dismissed"
  const isFirstOpen = hasDismissed === false

  return { showBadge, dismiss, isFirstOpen, isEnabled, isLoaded }
}
