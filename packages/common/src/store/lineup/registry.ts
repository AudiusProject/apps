import { LineupState } from '~/models/Lineup'
import {
  collectionPageLineupActions,
  collectionPageSelectors,
  feedPageLineupActions,
  feedPageSelectors,
  historyPageSelectors,
  historyPageTracksLineupActions,
  profilePageFeedLineupActions,
  profilePageSelectors,
  profilePageTracksLineupActions,
  remixesPageLineupActions,
  remixesPageSelectors,
  libraryPageSelectors,
  libraryPageTracksLineupActions,
  searchResultsPageSelectors,
  searchResultsPageTracksLineupActions
} from '~/store/pages'

import { CommonState } from '..'

type LineupEntry = {
  actions: any
  selector: (state: CommonState, handle?: string) => LineupState<any>
}

export const lineupRegistry: Record<string, LineupEntry> = {
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
  [libraryPageTracksLineupActions.prefix]: {
    actions: libraryPageTracksLineupActions,
    selector: libraryPageSelectors.getLibraryTracksLineup
  },
  [searchResultsPageTracksLineupActions.prefix]: {
    actions: searchResultsPageTracksLineupActions,
    selector: searchResultsPageSelectors.getSearchTracksLineup
  }
}
