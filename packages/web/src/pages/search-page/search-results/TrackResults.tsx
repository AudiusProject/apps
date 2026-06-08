import { useCallback, useMemo } from 'react'

import { SEARCH_PAGE_SIZE, useSearchTrackResults } from '@audius/common/api'
import { Kind, Name } from '@audius/common/models'
import { searchActions, SearchKind } from '@audius/common/store'
import { Flex } from '@audius/harmony'
import { css } from '@emotion/css'
import { useDispatch } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { TrackLineup } from 'components/lineup/TrackLineup'
import { LineupVariant } from 'components/lineup/types'
import { useIsMobile } from 'hooks/useIsMobile'
import { useMainContentRef } from 'pages/MainContentContext'

import { NoResultsTile } from '../NoResultsTile'
import { useSearchParams } from '../hooks'

const { addItem: addRecentSearch } = searchActions

type TrackResultsProps = {
  isPending: boolean
  isFetching: boolean
  isError: boolean
  category?: SearchKind
  count?: number
  waitForAllResults?: boolean
}

export const TrackResults = (props: TrackResultsProps) => {
  const {
    category = SearchKind.TRACKS,
    count,
    isPending,
    isFetching,
    isError,
    waitForAllResults = false
  } = props

  const mainContentRef = useMainContentRef()
  const isMobile = useIsMobile()

  const dispatch = useDispatch()

  const searchParams = useSearchParams()

  const handleClickTrackTile = useCallback(
    (id?: number) => {
      if (id) {
        dispatch(
          addRecentSearch({
            searchItem: {
              kind: Kind.TRACKS,
              id
            }
          })
        )
      }
      dispatch(
        make(Name.SEARCH_RESULT_SELECT, {
          searchText: searchParams.query,
          kind: 'track',
          id,
          source: 'search results page'
        })
      )
    },
    [dispatch, searchParams]
  )

  // Wait for useSearchAllResults to finish loading before fetching tracks
  const { trackIds, hasNextPage, loadNextPage, queryKey } =
    useSearchTrackResults(searchParams, {
      enabled: !waitForAllResults // Only fetch if not waiting for all results
    })

  const querySource = useMemo(
    () => ({ queryKey: [...queryKey] as unknown[] }),
    [queryKey]
  )

  // Whenever this component is shown on the AllResults page - we don't want to infinite scroll
  const shouldLoadMore = category === 'tracks'

  return (
    <TrackLineup
      trackIds={trackIds}
      source='SEARCH_TRACKS'
      querySource={querySource}
      pageSize={SEARCH_PAGE_SIZE}
      isFetching={isFetching}
      isPending={isPending}
      isError={isError}
      hasNextPage={shouldLoadMore ? hasNextPage : false}
      loadNextPage={shouldLoadMore ? loadNextPage : undefined}
      variant={LineupVariant.MAIN}
      scrollParent={mainContentRef.current}
      emptyElement={<NoResultsTile />}
      onClickTile={handleClickTrackTile}
      maxEntries={count}
      {...(!isMobile
        ? {
            lineupContainerStyles: css({ width: '100%' }),
            tileContainerStyles: css({
              display: 'flex',
              flexDirection: 'column',
              gap: '4px 16px',
              justifyContent: 'space-between'
            })
          }
        : {})}
    />
  )
}

export const TrackResultsPage = () => {
  const isMobile = useIsMobile()
  const searchParams = useSearchParams()
  const { isPending, isFetching, isError } = useSearchTrackResults(searchParams)

  return (
    <Flex p={isMobile ? 'l' : undefined} css={{ backgroundColor: 'default' }}>
      <TrackResults
        isPending={isPending}
        isFetching={isFetching}
        isError={isError}
      />
    </Flex>
  )
}
