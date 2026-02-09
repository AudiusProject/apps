import { useEffect } from 'react'

import { useAnalytics } from '@audius/common/hooks'
import type { ExploreSectionName } from '@audius/common/models'
import { Name } from '@audius/common/models'

import { useDeferredElement } from 'app/hooks/useDeferredElement'

/**
 * Hook to track explore section impressions when they come into view on mobile
 */
export const useExploreSectionTracking = (sectionName: ExploreSectionName) => {
  const { inView, InViewWrapper } = useDeferredElement()
  const { trackEvent } = useAnalytics()

  useEffect(() => {
    if (inView) {
      trackEvent({
        eventName: Name.EXPLORE_SECTION_VIEW,
        section: sectionName,
        source: 'mobile'
      })
    }
  }, [inView, sectionName, trackEvent])

  return { inView, InViewWrapper }
}
