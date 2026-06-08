import { useCallback, useMemo } from 'react'

import { useSearchTrackResults } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { Kind, Name } from '@audius/common/models'
import { searchActions } from '@audius/common/store'
import { Keyboard } from 'react-native'
import { useDispatch } from 'react-redux'

import { Flex } from '@audius/harmony-native'
import { TrackLineup } from 'app/components/lineup/TrackLineup'
import { make, track as record } from 'app/services/analytics'

import { NoResultsTile } from '../NoResultsTile'
import { SearchCatalogTile } from '../SearchCatalogTile'
import {
  useIsEmptySearch,
  useSearchFilters,
  useSearchQuery
} from '../searchState'

const { addItem: addRecentSearch } = searchActions

export const TrackResults = () => {
  const [query] = useSearchQuery()
  const [filters] = useSearchFilters()
  const {
    trackIds,
    loadNextPage,
    hasNextPage,
    isPending,
    isFetching,
    queryKey,
    pageSize
  } = useSearchTrackResults({
    query,
    ...filters
  })
  const dispatch = useDispatch()
  const isEmptySearch = useIsEmptySearch()

  const handlePress = useCallback(
    (id: ID) => {
      Keyboard.dismiss()
      dispatch(
        addRecentSearch({
          searchItem: {
            kind: Kind.TRACKS,
            id
          }
        })
      )

      record(
        make({
          eventName: Name.SEARCH_RESULT_SELECT,
          term: query,
          source: 'search results page',
          id,
          kind: 'track'
        })
      )
    },
    [dispatch, query]
  )

  const querySource = useMemo(
    () => ({ queryKey: [...queryKey] as unknown[] }),
    [queryKey]
  )

  if (isEmptySearch) return <SearchCatalogTile />

  const isEmpty = !isPending && !isFetching && trackIds.length === 0
  if (isEmpty) {
    return <NoResultsTile />
  }

  return (
    <Flex h='100%' backgroundColor='default'>
      <TrackLineup
        trackIds={trackIds}
        source='SEARCH_TRACKS'
        querySource={querySource}
        isPending={isPending}
        isFetching={isFetching}
        hasNextPage={hasNextPage}
        loadNextPage={loadNextPage}
        pageSize={pageSize}
        onPressItem={handlePress}
        ListFooterComponent={<Flex h={200} />}
      />
    </Flex>
  )
}
