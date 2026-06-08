import { ID } from '@audius/common/models'

// Tracks collection ids that exist only as unsaved local drafts (the inline
// "create playlist" flow). A draft is primed into the query cache with a
// generated id but is not persisted to the backend until the user hits Apply.
// The edit-mode provider reads this to auto-enter edit mode and to treat Apply
// as a create rather than an edit.
const draftCollectionIds = new Set<ID>()

export const addDraftCollection = (id: ID) => {
  draftCollectionIds.add(id)
}

export const removeDraftCollection = (id: ID) => {
  draftCollectionIds.delete(id)
}

export const isDraftCollection = (id: ID | null | undefined): boolean =>
  id != null && draftCollectionIds.has(id)
