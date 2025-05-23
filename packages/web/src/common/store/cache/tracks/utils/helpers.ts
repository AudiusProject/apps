import { queryCurrentUserId } from '@audius/common/api'
import { Kind, TrackMetadata, User } from '@audius/common/models'
import { cacheActions, reformatUser } from '@audius/common/store'
import { makeUid } from '@audius/common/utils'
import { uniqBy } from 'lodash'
import { put, call } from 'typed-redux-saga'

import { waitForRead } from 'utils/sagaHelpers'

/**
 * Adds users from track metadata to cache.
 * Dedupes and removes self.
 * @param metadataArray
 */
export function* addUsersFromTracks<T extends TrackMetadata & { user?: User }>(
  metadataArray: T[]
) {
  yield* waitForRead()
  const currentUserId = yield* call(queryCurrentUserId)
  let users = metadataArray
    .filter((m) => m.user)
    .map((m) => {
      const track = m as TrackMetadata & { user: User }
      return {
        id: track.user.user_id,
        uid: makeUid(Kind.USERS, track.user.user_id),
        metadata: reformatUser(track.user)
      }
    })

  if (!users.length) return

  // Don't add duplicate users or self
  users = uniqBy(users, 'id')
  users = users.filter((user) => !(currentUserId && user.id === currentUserId))

  yield put(
    cacheActions.add(Kind.USERS, users, /* replace */ false, /* persist */ true)
  )
}
