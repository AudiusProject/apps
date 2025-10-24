import {
  transformAndCleanList,
  userTrackMetadataFromSDK
} from '@audius/common/adapters'
import { primeTrackDataSaga } from '@audius/common/api'
import { ID, Track } from '@audius/common/models'
import { getSDK } from '@audius/common/store'
import { OptionalId } from '@audius/sdk'
import { call } from 'typed-redux-saga'

type RetrieveUserTracksArgs = {
  handle: string
  currentUserId: ID | null | undefined
  sort?: 'date' | 'plays'
  offset?: number
  limit?: number
  /**
   * This will only let a user obtain their own unlisted tracks, not
   * anyone's unlisted tracks. Prevention logic is in API.
   */
  getUnlisted?: boolean
}

export function* retrieveUserTracks({
  handle,
  currentUserId,
  sort,
  offset,
  limit,
  getUnlisted = false
}: RetrieveUserTracksArgs): Generator<any, Track[], any> {
  const sdk = yield* getSDK()
  const { data = [] } = yield* call(
    [sdk.full.users, sdk.full.users.getTracksByUserHandle],
    {
      handle,
      sort,
      limit,
      offset,
      userId: OptionalId.parse(currentUserId),
      filterTracks: getUnlisted ? 'all' : 'public'
    }
  )
  const apiTracks = transformAndCleanList(data, userTrackMetadataFromSDK)
  return yield* call(primeTrackDataSaga, apiTracks)
}
