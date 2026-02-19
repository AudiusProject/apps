import { Track } from '@audius/common/models'
import {
  trendingWinnersPageLineupSelectors,
  trendingWinnersPageLineupActions,
  QueueSource
} from '@audius/common/store'

import { LineupSagas } from 'common/store/lineup/sagas'

const { getLineup } = trendingWinnersPageLineupSelectors

/**
 * Returns tracks from the payload (passed when dispatching fetchLineupMetadatas).
 * The WinnersView fetches via useTrendingWinners and dispatches with { tracks }.
 */
function getTrendingWinners(args: {
  payload?: { tracks?: Track[] }
}): Promise<Track[]> {
  return Promise.resolve(args.payload?.tracks ?? [])
}

class TrendingWinnersSagas extends LineupSagas<Track> {
  constructor() {
    super(
      trendingWinnersPageLineupActions.prefix,
      trendingWinnersPageLineupActions,
      getLineup,
      getTrendingWinners,
      undefined,
      undefined,
      () => QueueSource.DISCOVER_TRENDING_WINNERS
    )
  }
}

const sagas = () => new TrendingWinnersSagas().getSagas()
export default sagas
