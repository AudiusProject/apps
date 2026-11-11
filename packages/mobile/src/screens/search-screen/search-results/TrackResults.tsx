import { useCallback, useMemo } from 'react'

import { useSearchTrackResults } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import type { ID } from '@audius/common/models'
import { Kind } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { searchActions } from '@audius/common/store'
import { Keyboard } from 'react-native'
import { useDispatch } from 'react-redux'

import { Flex } from '@audius/harmony-native'
import { TrackLineup } from 'app/components/lineup/TrackLineup'

import { NoResultsTile } from '../NoResultsTile'
import { SearchCatalogTile } from '../SearchCatalogTile'
import {
  useIsEmptySearch,
  useSearchFilters,
  useSearchQuery
} from '../searchState'

const { addItem: addRecentSearch } = searchActions

export const TrackResults = () => {
  const { isEnabled: isTrackRowsEnabled } = useFeatureFlag(
    FeatureFlags.TRACK_ROWS
  )
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
    },
    [dispatch]
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
        tileVariant={isTrackRowsEnabled ? 'row' : 'tile'}
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
