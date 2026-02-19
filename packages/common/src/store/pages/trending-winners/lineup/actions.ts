import { LineupActions } from '../../../lineup/actions'

export const PREFIX = 'TRENDING_WINNERS'

class TrendingWinnersPageLineupActions extends LineupActions {
  constructor() {
    super(PREFIX)
  }
}

export const trendingWinnersPageLineupActions =
  new TrendingWinnersPageLineupActions()
