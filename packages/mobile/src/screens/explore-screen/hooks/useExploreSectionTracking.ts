import type { ExploreSectionName } from '@audius/common/models'

import { useDeferredElement } from 'app/hooks/useDeferredElement'

/**
 * Hook to track explore section impressions when they come into view on mobile
 */
export const useExploreSectionTracking = (sectionName: ExploreSectionName) => {
  const { inView, InViewWrapper } = useDeferredElement()

  return { inView, InViewWrapper }
}
