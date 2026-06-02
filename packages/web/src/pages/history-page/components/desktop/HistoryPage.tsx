import { ChangeEvent, useCallback, useMemo, useState } from 'react'

import { useCurrentUserId, useTrackHistory } from '@audius/common/api'
import { Name, PlaybackSource, ID } from '@audius/common/models'
import { playbackActions, playbackSelectors } from '@audius/common/store'
import type { PlaybackTrack } from '@audius/common/store'
import {
  Button,
  IconListeningHistory,
  IconPause,
  IconPlay,
  useTheme
} from '@audius/harmony'
import {
  GetUsersTrackHistorySortMethodEnum,
  GetUsersTrackHistorySortDirectionEnum
} from '@audius/sdk'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router'

import { make } from 'common/store/analytics/actions'
import FilterInput from 'components/filter-input/FilterInput'
import { Header } from 'components/header/desktop/Header'
import Page from 'components/page/Page'
import { dateSorter } from 'components/table'
import { RESPONSIVE_TABLE_POLICIES } from 'components/table/responsivePolicies'
import { TrackTableLineup, TracksTableColumn } from 'components/tracks-table'
import EmptyTable from 'components/tracks-table/EmptyTable'
import { useMainContentRef } from 'pages/MainContentContext'

import styles from './HistoryPage.module.css'

const messages = {
  noHistoryMessage: "You haven't listened to any tracks yet",
  noResultsMessage: 'No tracks match your search',
  inputPlaceholder: 'Filter Tracks'
}

export type HistoryPageProps = {
  title: string
  description: string
}

const pageSize = 50
const HISTORY_SOURCE = 'HISTORY_TRACKS'
const historyTableColumns: TracksTableColumn[] = [
  'trackName',
  'releaseDate',
  'listenDate',
  'length',
  'plays',
  'reposts',
  'overflowActions'
]

export const HistoryPage = ({ title, description }: HistoryPageProps) => {
  const { spacing } = useTheme()
  const { data: currentUserId } = useCurrentUserId()
  const dispatch = useDispatch()
  const mainContentRef = useMainContentRef()
  const navigate = useNavigate()

  // Filter state
  const [filterText, setFilterText] = useState('')
  const onFilterChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value)
  }, [])

  const [sortMethod, setSortMethod] =
    useState<GetUsersTrackHistorySortMethodEnum>()
  const [sortDirection, setSortDirection] =
    useState<GetUsersTrackHistorySortDirectionEnum>()

  const handleSort = useCallback(({ column, order }: any) => {
    setSortMethod(column?.accessor)
    setSortDirection(order === 'ascend' ? 'asc' : 'desc')
  }, [])

  const {
    trackIds,
    isInitialLoading,
    isPending,
    isFetching,
    hasNextPage,
    loadNextPage
  } = useTrackHistory({
    query: filterText,
    pageSize,
    sortMethod,
    sortDirection
  })

  const isPlaying = useSelector(playbackSelectors.getPlaying)
  const currentPlaybackTrackId = useSelector(
    playbackSelectors.getCurrentTrackId
  )
  const isEmpty = trackIds.length === 0

  const playbackQueue: PlaybackTrack[] = useMemo(
    () =>
      trackIds.map((id) => ({
        trackId: id,
        source: HISTORY_SOURCE
      })),
    [trackIds]
  )

  const handlePlay = useCallback(() => {
    if (playbackQueue.length === 0) return
    const firstId = playbackQueue[0].trackId as ID
    if (isPlaying && currentPlaybackTrackId === firstId) {
      dispatch(playbackActions.togglePlay())
      dispatch(
        make(Name.PLAYBACK_PAUSE, {
          id: `${firstId}`,
          source: PlaybackSource.HISTORY_PAGE
        })
      )
      return
    }
    if (!isPlaying && currentPlaybackTrackId === firstId) {
      dispatch(playbackActions.play())
      dispatch(
        make(Name.PLAYBACK_PLAY, {
          id: `${firstId}`,
          source: PlaybackSource.HISTORY_PAGE
        })
      )
      return
    }
    dispatch(
      playbackActions.playFrom({
        tracks: playbackQueue,
        startIndex: 0,
        querySource: null
      })
    )
    dispatch(
      make(Name.PLAYBACK_PLAY, {
        id: `${firstId}`,
        source: PlaybackSource.HISTORY_PAGE
      })
    )
  }, [dispatch, isPlaying, currentPlaybackTrackId, playbackQueue])

  const playAllButton = !isInitialLoading ? (
    <Button
      variant='primary'
      size='small'
      css={{ marginLeft: spacing.xl }}
      iconLeft={isPlaying ? IconPause : IconPlay}
      onClick={handlePlay}
    >
      {isPlaying ? 'Pause' : 'Play'}
    </Button>
  ) : null

  const filter = (
    <FilterInput
      placeholder={messages.inputPlaceholder}
      onChange={onFilterChange}
      value={filterText}
    />
  )

  const header = (
    <Header
      icon={IconListeningHistory}
      primary='History'
      secondary={isEmpty ? null : playAllButton}
      containerStyles={styles.historyPageHeader}
      rightDecorator={!isEmpty || filter}
    />
  )

  const defaultSorter = useMemo(() => dateSorter('dateListened'), [])

  return (
    <Page
      title={title}
      description={description}
      contentClassName={styles.historyPageWrapper}
      header={header}
    >
      <div className={styles.bodyWrapper}>
        {isEmpty && !isInitialLoading ? (
          <EmptyTable
            primaryText={
              filter ? messages.noResultsMessage : messages.noHistoryMessage
            }
            secondaryText={filter ? '' : messages.noHistoryMessage}
            buttonLabel={filter ? undefined : 'Start Listening'}
            onClick={filter ? undefined : () => navigate('/trending')}
          />
        ) : (
          <TrackTableLineup
            source={HISTORY_SOURCE}
            trackIds={trackIds}
            isPending={isPending}
            isFetching={isFetching}
            isInitialLoading={isInitialLoading}
            hasNextPage={hasNextPage}
            loadNextPage={loadNextPage}
            pageSize={pageSize}
            columns={historyTableColumns}
            userId={currentUserId}
            defaultSorter={defaultSorter}
            showArtistInTrackNameColumn
            responsiveColumns={RESPONSIVE_TABLE_POLICIES.historyTracks}
            scrollRef={mainContentRef}
            isVirtualized
            onSort={handleSort}
          />
        )}
      </div>
    </Page>
  )
}
