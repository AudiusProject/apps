import { CommonState } from '~/store/commonStore'

export const getLineup = (state: CommonState) =>
  state.pages.trendingWinners.trending
