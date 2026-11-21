import type { ExploreSectionName } from '@audius/common/models'

import { useDeferredElement } from 'app/hooks/useDeferredElement'

export const useExploreSectionTracking = (sectionName: ExploreSectionName) => {
  const { inView, InViewWrapper } = useDeferredElement()

  return { inView, InViewWrapper }
}
