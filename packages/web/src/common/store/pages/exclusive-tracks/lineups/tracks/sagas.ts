import { Track } from '@audius/common/models'
import {
  exclusiveTracksPageSelectors,
  exclusiveTracksPageLineupActions
} from '@audius/common/store'

import { LineupSagas } from 'common/store/lineup/sagas'

const { getLineup } = exclusiveTracksPageSelectors

function* getExclusiveTracks(action: {
  offset: number
  limit: number
  payload?: { items?: Track[] }
}) {
  const { payload } = action

  // The TanStack Query hook already fetched and primed the data
  // Just return the items from the payload
  return payload?.items ?? []
}

class ExclusiveTracksSagas extends LineupSagas<Track> {
  constructor() {
    super(
      exclusiveTracksPageLineupActions.prefix,
      exclusiveTracksPageLineupActions,
      getLineup,
      getExclusiveTracks,
      undefined,
      true,
      undefined
    )
  }
}

export default function sagas() {
  return new ExclusiveTracksSagas().getSagas()
}
