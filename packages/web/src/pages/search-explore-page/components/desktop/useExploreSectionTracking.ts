import { ExploreSectionName } from '@audius/common/models'

import { useDeferredElement } from './useDeferredElement'

export const useExploreSectionTracking = (_sectionName: ExploreSectionName) => {
  const { ref, inView } = useDeferredElement()

  return { ref, inView }
}
