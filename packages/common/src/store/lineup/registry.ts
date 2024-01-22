import { LineupState } from 'models/Lineup'
import {
  aiPageLineupActions,
  aiPageSelectors,
  collectionPageLineupActions,
  collectionPageSelectors,
  feedPageLineupActions,
  feedPageSelectors,
  historyPageSelectors,
  historyPageTracksLineupActions,
  premiumTracksPageLineupActions,
  premiumTracksPageLineupSelectors,
  profilePageFeedLineupActions,
  profilePageSelectors,
  profilePageTracksLineupActions,
  remixesPageLineupActions,
  remixesPageSelectors,
  savedPageSelectors,
  savedPageTracksLineupActions,
  searchResultsPageSelectors,
  searchResultsPageTracksLineupActions,
  trendingPageLineupActions,
  trendingPageSelectors,
  trendingPlaylistsPageLineupActions,
  trendingPlaylistsPageLineupSelectors,
  trendingUndergroundPageLineupActions,
  trendingUndergroundPageLineupSelectors
} from 'store/pages'

import { CommonState } from '..'

type LineupEntry = {
  actions: any
  selector: (state: CommonState, handle?: string) => LineupState<any>
}

export const lineupRegistry: Record<string, LineupEntry> = {
  [aiPageLineupActions.prefix]: {
    actions: aiPageLineupActions,
    selector: aiPageSelectors.getLineup
  },
  [collectionPageLineupActions.prefix]: {
    actions: collectionPageLineupActions,
    selector: collectionPageSelectors.getCollectionTracksLineup
  },
  [feedPageLineupActions.prefix]: {
    actions: feedPageLineupActions,
    selector: feedPageSelectors.getDiscoverFeedLineup
  },
  [historyPageTracksLineupActions.prefix]: {
    actions: historyPageTracksLineupActions,
    selector: historyPageSelectors.getHistoryTracksLineup
  },
  [premiumTracksPageLineupActions.prefix]: {
    actions: premiumTracksPageLineupActions,
    selector: premiumTracksPageLineupSelectors.getLineup
  },
  [profilePageFeedLineupActions.prefix]: {
    actions: profilePageFeedLineupActions,
    selector: profilePageSelectors.getProfileFeedLineup
  },
  [profilePageTracksLineupActions.prefix]: {
    actions: profilePageTracksLineupActions,
    selector: profilePageSelectors.getProfileTracksLineup
  },
  [remixesPageLineupActions.prefix]: {
    actions: remixesPageLineupActions,
    selector: remixesPageSelectors.getLineup
  },
  [savedPageTracksLineupActions.prefix]: {
    actions: savedPageTracksLineupActions,
    selector: savedPageSelectors.getSavedTracksLineup
  },
  [searchResultsPageTracksLineupActions.prefix]: {
    actions: searchResultsPageTracksLineupActions,
    selector: searchResultsPageSelectors.getSearchTracksLineup
  },
  [trendingPageLineupActions.trendingWeekActions.prefix]: {
    actions: trendingPageLineupActions.trendingWeekActions,
    selector: trendingPageSelectors.getDiscoverTrendingWeekLineup
  },
  [trendingPageLineupActions.trendingMonthActions.prefix]: {
    actions: trendingPageLineupActions.trendingMonthActions,
    selector: trendingPageSelectors.getDiscoverTrendingMonthLineup
  },
  [trendingPageLineupActions.trendingAllTimeActions.prefix]: {
    actions: trendingPageLineupActions.trendingAllTimeActions,
    selector: trendingPageSelectors.getDiscoverTrendingAllTimeLineup
  },
  [trendingPlaylistsPageLineupActions.prefix]: {
    actions: trendingPlaylistsPageLineupActions,
    selector: trendingPlaylistsPageLineupSelectors.getLineup
  },
  [trendingUndergroundPageLineupActions.prefix]: {
    actions: trendingUndergroundPageLineupActions,
    selector: trendingUndergroundPageLineupSelectors.getLineup
  }
}
