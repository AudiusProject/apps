import {
  transformAndCleanList,
  userTrackMetadataFromSDK
} from '@audius/common/adapters'
import { primeTrackDataSaga, queryCurrentUserId } from '@audius/common/api'
import { Track } from '@audius/common/models'
import {
  premiumTracksPageLineupSelectors,
  premiumTracksPageLineupActions,
  getSDK
} from '@audius/common/store'
import { OptionalId } from '@audius/sdk/services'
import { call } from 'typed-redux-saga'

import { LineupSagas } from 'common/store/lineup/sagas'
import { waitForRead } from 'utils/sagaHelpers'

const { getLineup } = premiumTracksPageLineupSelectors

function* getPremiumTracks({
  offset,
  limit
}: {
  offset: number
  limit: number
}) {
  yield* waitForRead()
  const sdk = yield* getSDK()
  const currentUserId = yield* call(queryCurrentUserId)
  const { data = [] } = yield* call(
    [sdk.tracks, sdk.tracks.getTrendingUSDCPurchaseTracks],
    { limit, offset, userId: OptionalId.parse(currentUserId) }
  )
  const tracks = transformAndCleanList(data, userTrackMetadataFromSDK)
  return yield* call(primeTrackDataSaga, tracks)
}

class PremiumTracksSagas extends LineupSagas<Track> {
  constructor() {
    super(
      premiumTracksPageLineupActions.prefix,
      premiumTracksPageLineupActions,
      getLineup,
      getPremiumTracks,
      undefined,
      true,
      undefined
    )
  }
}

export default function sagas() {
  return new PremiumTracksSagas().getSagas()
}
