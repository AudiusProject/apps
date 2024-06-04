import { useProxySelector } from '@audius/common/hooks'
import { Status } from '@audius/common/models'
import type { CommonState } from '@audius/common/store'
import { searchResultsPageSelectors, SearchKind } from '@audius/common/store'

import { ProfileList } from 'app/components/user-list'
import { spacing } from 'app/styles/spacing'

import { EmptyResults } from '../EmptyResults'

import { useFetchTabResultsEffect } from './useFetchTabResultsEffect'
import { useTrackSearchResultSelect } from './useTrackSearchResultSelect'

const { getSearchStatus } = searchResultsPageSelectors

const selectSearchUsers = (state: CommonState) => {
  const searchStatus = getSearchStatus(state)
  if (searchStatus === Status.LOADING) return undefined

  return state.pages.searchResults.artistIds
    ?.map((artistId) => state.users.entries[artistId].metadata)
    .filter((artist) => !artist.is_deactivated)
}

export const ProfilesTab = () => {
  const onSelectSearchResult = useTrackSearchResultSelect(
    'profile',
    'more results page'
  )
  const users = useProxySelector(selectSearchUsers, [])

  useFetchTabResultsEffect(SearchKind.USERS)

  return (
    <ProfileList
      style={{ paddingTop: spacing(3) }}
      onCardPress={onSelectSearchResult}
      isLoading={!users}
      profiles={users}
      ListEmptyComponent={<EmptyResults />}
    />
  )
}
