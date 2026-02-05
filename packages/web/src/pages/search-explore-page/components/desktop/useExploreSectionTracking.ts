import { useEffect } from 'react'

import { useAnalytics } from '@audius/common/hooks'
import { ExploreSectionName, Name } from '@audius/common/models'

import { useIsMobile } from 'hooks/useIsMobile'

import { useDeferredElement } from './useDeferredElement'

/**
 * Hook to track explore section impressions when they come into view
 */
export const useExploreSectionTracking = (sectionName: ExploreSectionName) => {
  const { ref, inView } = useDeferredElement()
  const { trackEvent } = useAnalytics()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (inView) {
      trackEvent({
        eventName: Name.EXPLORE_SECTION_VIEW,
        section: sectionName,
        source: isMobile ? 'mobile' : 'web'
      })
    }
  }, [inView, sectionName, isMobile, trackEvent])

  return { ref, inView }
}
