import { ID } from '@audius/common/models'
import {
  collectionPageLineupActions,
  collectionPageSelectors
} from '@audius/common/store'
import { put, select } from 'typed-redux-saga'

/**
 * Refreshes the collection page Redux lineup when the user is viewing the
 * given playlist. The lineup saga will call getCollectionTracks, which reads
 * from the React Query cache. After an optimistic update, this ensures the
 * lineup (which the collection page displays) reflects the updated collection.
 */
export function* refreshCollectionPageLineupIfViewing(playlistId: ID) {
  const collectionId: ID | null = yield* select(
    collectionPageSelectors.getCollectionId
  )
  if (collectionId === playlistId) {
    yield* put(
      collectionPageLineupActions.fetchLineupMetadatas(0, 200, false, undefined)
    )
  }
}
