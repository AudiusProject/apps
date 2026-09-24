import { ExploreSectionName } from '@audius/common/models'

import { useDeferredElement } from './useDeferredElement'

/**
 * Hook to defer rendering of explore sections until they come into view
 */
export const useExploreSectionTracking = (_sectionName: ExploreSectionName) => {
  const { ref, inView } = useDeferredElement()

  return { ref, inView }
}
