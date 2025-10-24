import { useCallback } from 'react'

import { SEARCH_PAGE_SIZE, useSearchTrackResults } from '@audius/common/api'
import { Kind, Name } from '@audius/common/models'
import {
  searchResultsPageTracksLineupActions,
  searchActions,
  SearchKind
} from '@audius/common/store'
import { Flex } from '@audius/harmony'
import { css } from '@emotion/css'
import { useDispatch } from 'react-redux'

import { make } from 'common/store/analytics/actions'
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import { LineupVariant } from 'components/lineup/types'
import { useIsMobile } from 'hooks/useIsMobile'
import { useMainContentRef } from 'pages/MainContentContext'

import { NoResultsTile } from '../NoResultsTile'
import { useSearchParams } from '../hooks'
import { ViewLayout } from '../types'

const { addItem: addRecentSearch } = searchActions

type TrackResultsProps = {
  isPending: boolean
  isFetching: boolean
  isError: boolean
  viewLayout?: ViewLayout
  category?: SearchKind
  count?: number
  waitForAllResults?: boolean
}

export const TrackResults = (props: TrackResultsProps) => {
  const {
    category = SearchKind.TRACKS,
    viewLayout = 'list',
    count,
    isPending,
    isFetching,
    isError,
    waitForAllResults = false
  } = props

  const mainContentRef = useMainContentRef()
  const isMobile = useIsMobile()

  const dispatch = useDispatch()

  const isTrackGridLayout = viewLayout === 'grid'

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
  const { data, hasNextPage, loadNextPage, isPlaying, play, pause, lineup } =
    useSearchTrackResults(searchParams, {
      enabled: !waitForAllResults // Only fetch if not waiting for all results
    })

  return (
    <TanQueryLineup
      data={data}
      lineup={lineup}
      pageSize={SEARCH_PAGE_SIZE}
      isFetching={isFetching}
      isPending={isPending}
      isError={isError}
      hasNextPage={hasNextPage}
      loadNextPage={loadNextPage}
      isPlaying={isPlaying}
      play={play}
      pause={pause}
      variant={viewLayout === 'grid' ? LineupVariant.GRID : LineupVariant.MAIN}
      scrollParent={mainContentRef.current}
      actions={searchResultsPageTracksLineupActions}
      emptyElement={<NoResultsTile />}
      onClickTile={handleClickTrackTile}
      maxEntries={count}
      // Whenever this component is shown on the AllResults page - we don't want to infinite scroll
      shouldLoadMore={category === 'tracks'}
      {...(!isMobile
        ? {
            lineupContainerStyles: css({ width: '100%' }),
            tileContainerStyles: css({
              display: isTrackGridLayout ? 'grid' : 'flex',
              flexDirection: isTrackGridLayout ? undefined : 'column',
              gridTemplateColumns: isTrackGridLayout
                ? 'repeat(auto-fit, minmax(450px, 1fr))' // wrap columns to fit
                : undefined,
              gap: '4px 16px',
              justifyContent: 'space-between'
            })
          }
        : {})}
    />
  )
}

type TrackResultsPageProps = {
  layout?: ViewLayout
}

export const TrackResultsPage = ({ layout }: TrackResultsPageProps) => {
  const searchParams = useSearchParams()
  const { isPending, isFetching, isError } = useSearchTrackResults(searchParams)

  return (
    <Flex p={'l'} css={{ backgroundColor: 'default' }}>
      <TrackResults
        viewLayout={layout}
        isPending={isPending}
        isFetching={isFetching}
        isError={isError}
      />
    </Flex>
  )
}
