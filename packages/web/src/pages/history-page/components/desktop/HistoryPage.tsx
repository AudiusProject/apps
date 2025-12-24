import { ChangeEvent, useCallback, useMemo, useState } from 'react'

import { useCurrentUserId, useTrackHistory } from '@audius/common/api'
import { Name, PlaybackSource, Track } from '@audius/common/models'
import {
  Button,
  IconListeningHistory,
  IconPause,
  IconPlay
} from '@audius/harmony'
import { full } from '@audius/sdk'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router'

import { make } from 'common/store/analytics/actions'
import FilterInput from 'components/filter-input/FilterInput'
import { Header } from 'components/header/desktop/Header'
import Page from 'components/page/Page'
import { dateSorter } from 'components/table'
import { TrackTableLineup } from 'components/tracks-table'
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

export const HistoryPage = ({ title, description }: HistoryPageProps) => {
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
    useState<full.GetUsersTrackHistorySortMethodEnum>()
  const [sortDirection, setSortDirection] =
    useState<full.GetUsersTrackHistorySortDirectionEnum>()

  const handleSort = useCallback(({ column, order }: any) => {
    setSortMethod(column?.accessor)
    setSortDirection(order === 'ascend' ? 'asc' : 'desc')
  }, [])

  const lineupQueryData = useTrackHistory({
    query: filterText,
    pageSize,
    sortMethod,
    sortDirection
  })

  const { isPlaying, play, pause, lineup, isInitialLoading } = lineupQueryData
  const isEmpty = lineup.entries.length === 0

  const handlePlay = useCallback(() => {
    if (lineup.entries.length > 0) {
      const track = lineup.entries[0] as Track & { uid: string }
      if (isPlaying) {
        pause()
        dispatch(
          make(Name.PLAYBACK_PAUSE, {
            id: `${track.track_id}`,
            source: PlaybackSource.HISTORY_PAGE
          })
        )
      } else {
        play(track.uid)
        dispatch(
          make(Name.PLAYBACK_PLAY, {
            id: `${track.track_id}`,
            source: PlaybackSource.HISTORY_PAGE
          })
        )
      }
    }
  }, [dispatch, isPlaying, lineup.entries, pause, play])

  const playAllButton = !isInitialLoading ? (
    <Button
      variant='primary'
      size='small'
      css={(theme) => ({ marginLeft: theme.spacing.xl })}
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
            lineupQueryData={lineupQueryData}
            userId={currentUserId}
            defaultSorter={defaultSorter}
            scrollRef={mainContentRef}
            isVirtualized
            onSort={handleSort}
          />
        )}
      </div>
    </Page>
  )
}
