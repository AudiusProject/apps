import { ID } from '@audius/common/models'

const draftCollectionIds = new Set<ID>()

export const addDraftCollection = (id: ID) => {
  draftCollectionIds.add(id)
}

export const removeDraftCollection = (id: ID) => {
  draftCollectionIds.delete(id)
}

export const isDraftCollection = (id: ID | null | undefined): boolean =>
  id != null && draftCollectionIds.has(id)
