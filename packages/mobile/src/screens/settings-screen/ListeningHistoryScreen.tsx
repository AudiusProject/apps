import { useMemo, useState } from 'react'

import {
  getTrackHistoryQueryKey,
  useCurrentUserId,
  useTrackHistory
} from '@audius/common/api'
import { useDebouncedCallback } from '@audius/common/hooks'

import { IconListeningHistory, Paper } from '@audius/harmony-native'
import { EmptyTile, Screen, ScreenContent } from 'app/components/core'
import { EmptyTileCTA } from 'app/components/empty-tile-cta'
import { FilterInput } from 'app/components/filter-input'
import { TrackLineup } from 'app/components/lineup/TrackLineup'

const messages = {
  title: 'Listening History',
  noHistoryMessage: "You haven't listened to any tracks yet",
  noResultsMessage: 'No tracks match your search',
  inputPlaceholder: 'Filter Tracks'
}

export const ListeningHistoryScreen = () => {
  const [filterValue, setFilterValue] = useState('')
  const { data: currentUserId } = useCurrentUserId()

  const queryArgs = useMemo(
    () => ({
      query: filterValue
    }),
    [filterValue]
  )

  const {
    trackIds,
    loadNextPage,
    isPending,
    isFetching,
    hasNextPage,
    pageSize
  } = useTrackHistory(queryArgs)

  const querySource = useMemo(
    () => ({
      queryKey: [
        ...getTrackHistoryQueryKey(currentUserId, queryArgs)
      ] as unknown[]
    }),
    [currentUserId, queryArgs]
  )

  const handleChangeFilterValue = useDebouncedCallback(
    (value: string) => {
      setFilterValue(value)
    },
    [setFilterValue],
    100
  )

  const showEmptyMessage = !isPending && !isFetching && trackIds.length === 0
  const showNoResults = showEmptyMessage && filterValue.length > 0
  const showNoHistory = showEmptyMessage && !filterValue

  return (
    <Screen
      title={messages.title}
      icon={IconListeningHistory}
      topbarRight={null}
      variant='secondary'
    >
      <ScreenContent>
        {showNoHistory ? (
          <EmptyTileCTA message={messages.noHistoryMessage} />
        ) : (
          <Paper m='l' gap='l' h='100%'>
            <FilterInput
              placeholder={messages.inputPlaceholder}
              onChangeText={handleChangeFilterValue}
              shadow='flat'
              mb={0}
              mh='s'
            />
            <TrackLineup
              trackIds={trackIds}
              source='HISTORY_TRACKS'
              querySource={querySource}
              isPending={isPending}
              isFetching={isFetching}
              hasNextPage={hasNextPage}
              loadNextPage={loadNextPage}
              pageSize={pageSize}
            />
          </Paper>
        )}
        {showNoResults ? (
          <EmptyTile message={messages.noResultsMessage} />
        ) : null}
      </ScreenContent>
    </Screen>
  )
}
