import { useCallback, useRef, useState } from 'react'

import { Name, Status, TimeRange } from '@audius/common/models'
import { trendingPageLineupActions } from '@audius/common/store'
import { ELECTRONIC_PREFIX, TRENDING_GENRES } from '@audius/common/utils'
import { IconTrending } from '@audius/harmony'

import { make, useRecord } from 'common/store/analytics/actions'
import { Header } from 'components/header/desktop/Header'
import EndOfLineup from 'components/lineup/EndOfLineup'
import Lineup from 'components/lineup/Lineup'
import { LineupVariant } from 'components/lineup/types'
import Page from 'components/page/Page'
import useTabs from 'hooks/useTabs/useTabs'
import { TRENDING_MESSAGES } from 'pages/trending-page/constants'
import { useTrendingActions } from 'pages/trending-page/hooks/useTrendingActions'
import { useTrendingLineups } from 'pages/trending-page/hooks/useTrendingLineups'
import { useTrendingPageCleanup } from 'pages/trending-page/hooks/useTrendingPageCleanup'
import { useTrendingPageState } from 'pages/trending-page/hooks/useTrendingPageState'
import { useTrendingUrlParams } from 'pages/trending-page/hooks/useTrendingUrlParams'

import RewardsBanner from '../RewardsBanner'

import GenreSelectionModal from './GenreSelectionModal'
import { TrendingGenreFilters } from './TrendingGenreFilters'
import styles from './TrendingPageContent.module.css'
const { trendingAllTimeActions, trendingMonthActions, trendingWeekActions } =
  trendingPageLineupActions

const messages = {
  thisWeek: 'This Week',
  thisMonth: 'This Month',
  allTime: 'All Time',
  allGenres: 'All Genres',
  endOfLineupDescription: "Looks like you've reached the end of this list...",
  disabledTabTooltip: 'Nothing available'
}

type TrendingPageContentProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

// Creates a unique cache key for a time range & genre combination
const getTimeGenreCacheKey = (timeRange: TimeRange, genre: string | null) => {
  const newGenre = genre || 'all'
  return `${timeRange}-${newGenre}`
}

// For a given timeRange with no tracks,
// what other time ranges do we need to disable?
const getRangesToDisable = (timeRange: TimeRange) => {
  switch (timeRange) {
    case TimeRange.ALL_TIME:
    case TimeRange.MONTH:
      // In the case of TimeRangeALL_TIME,
      // we don't want to return ALL_TIME because
      // we don't want to disable ALL_TIME (it's the only possible tab left, even if it's empty).
      return [TimeRange.MONTH, TimeRange.WEEK]
    case TimeRange.WEEK:
      return [TimeRange.WEEK]
  }
}

const TrendingPageContent = ({ containerRef }: TrendingPageContentProps) => {
  const trendingPageState = useTrendingPageState()
  const actions = useTrendingActions()
  const lineups = useTrendingLineups({
    trendingPageState,
    containerRef: containerRef || undefined
  })

  useTrendingUrlParams({
    trendingPageState,
    setTrendingGenre: actions.setTrendingGenre,
    setTrendingTimeRange: actions.setTrendingTimeRange,
    replaceRoute: actions.replaceRoute
  })

  useTrendingPageCleanup({ trendingPageState, actions })

  const { trendingTitle, pageTitle, trendingDescription } = TRENDING_MESSAGES
  const {
    trendingWeek,
    trendingMonth,
    trendingAllTime,
    getLineupProps,
    getLineupForRange,
    scrollToTop
  } = lineups
  const { trendingGenre, trendingTimeRange, lastFetchedTrendingGenre } =
    trendingPageState
  const {
    makeLoadMore,
    makePlayTrack,
    makePauseTrack,
    makeSetInView,
    makeResetTrending,
    setTrendingGenre,
    setTrendingTimeRange
  } = actions

  const weekProps = getLineupProps(trendingWeek)
  const monthProps = getLineupProps(trendingMonth)
  const allTimeProps = getLineupProps(trendingAllTime)

  // Maintain a set of combinations of time range & genre that
  // have no tracks.
  const emptyTimeGenreSet = useRef(new Set())

  const getLimit = useCallback(
    (timeRange: TimeRange) => {
      return getLineupForRange(timeRange).lineup.total
    },
    [getLineupForRange]
  )

  const reloadAndSwitchTabs = (timeRange: TimeRange) => {
    makeResetTrending(timeRange)()
    setTrendingTimeRange(timeRange)
    scrollToTop(timeRange)
    const offset = 0
    makeLoadMore(timeRange)(offset, getLimit(timeRange), true)
  }

  // Called when we have an empty state
  const moveToNextTab = () => {
    switch (trendingTimeRange) {
      case TimeRange.WEEK: {
        // If week is empty, month might also be empty (because we accessed it previously.)
        // If month is also empty, jump straight to all time.
        const monthAlsoEmpty = emptyTimeGenreSet.current.has(
          getTimeGenreCacheKey(TimeRange.MONTH, trendingGenre!)
        )
        const newTimeRange = monthAlsoEmpty
          ? TimeRange.ALL_TIME
          : TimeRange.MONTH
        reloadAndSwitchTabs(newTimeRange)
        break
      }
      case TimeRange.MONTH:
        reloadAndSwitchTabs(TimeRange.ALL_TIME)
        break
      case TimeRange.ALL_TIME:
      default:
      // Nothing to do for all time
    }
  }

  const setGenreAndRefresh = useCallback(
    (genre: string | null) => {
      const trimmedGenre =
        genre !== null ? genre.replace(ELECTRONIC_PREFIX, '') : genre
      setTrendingGenre(trimmedGenre)

      // Call reset to change everything everything to skeleton tiles
      makeResetTrending(TimeRange.WEEK)()
      makeResetTrending(TimeRange.MONTH)()
      makeResetTrending(TimeRange.ALL_TIME)()

      scrollToTop(trendingTimeRange)

      const limit = getLimit(trendingTimeRange)
      const offset = 0
      makeLoadMore(trendingTimeRange)(offset, limit, true)
    },
    [
      setTrendingGenre,
      makeLoadMore,
      trendingTimeRange,
      scrollToTop,
      makeResetTrending,
      getLimit
    ]
  )

  const cacheKey = getTimeGenreCacheKey(trendingTimeRange, trendingGenre)
  const currentLineup = getLineupForRange(trendingTimeRange)

  // We switch genres slightly before we fetch new lineup metadata, so if we're on a dead page
  // (e.g. some obscure genre with no All Time tracks), and then switch to a more popular genre
  // we will briefly be in a state with the New Genre set, but lineup status === Success and an empty
  // entries list. This would errantly cause us to think the lineup was empty and insert it into the cache.
  const unfetchedLineup = trendingGenre !== lastFetchedTrendingGenre

  // Should move to next tab if:
  //  - We've already seen this tab is empty AND we're not in the loading state
  //  OR
  //  - The current lineup was the last lineup fetched
  //    AND
  //  - The current lineup has finished fetching
  //    AND
  //  - The current lineup has no trending order (to ensure we're not in the middle of resetting/refretching)
  //    AND
  //  - We're not in the all genres (genre = null) state
  const shouldMoveToNextTab =
    (emptyTimeGenreSet.current.has(cacheKey) &&
      currentLineup.lineup.status !== Status.LOADING) ||
    (!unfetchedLineup &&
      currentLineup.lineup.status === Status.SUCCESS &&
      !currentLineup.lineup.entries.length &&
      trendingGenre !== null)

  if (shouldMoveToNextTab) {
    getRangesToDisable(trendingTimeRange)
      .map((r) => getTimeGenreCacheKey(r, trendingGenre))
      .forEach((k) => {
        emptyTimeGenreSet.current.add(k)
      })

    moveToNextTab()
  }

  const mainLineupProps = {
    variant: LineupVariant.MAIN
  }

  const trendingLineups = [
    <div
      key={`weekly-trending-tracks-${trendingGenre}`}
      className={styles.lineupContainer}
    >
      {trendingGenre === null ? (
        <div className={styles.bannerContainer}>
          <RewardsBanner bannerType='tracks' />
        </div>
      ) : null}
      <Lineup
        aria-label='weekly trending tracks'
        ordered
        {...weekProps}
        setInView={makeSetInView(TimeRange.WEEK)}
        loadMore={makeLoadMore(TimeRange.WEEK)}
        playTrack={makePlayTrack(TimeRange.WEEK)}
        pauseTrack={makePauseTrack(TimeRange.WEEK)}
        actions={trendingWeekActions}
        endOfLineup={
          <EndOfLineup description={messages.endOfLineupDescription} />
        }
        {...mainLineupProps}
      />
    </div>,
    <div
      key={`monthly-trending-tracks-${trendingGenre}`}
      className={styles.lineupContainer}
    >
      <Lineup
        aria-label='monthly trending tracks'
        ordered
        {...monthProps}
        setInView={makeSetInView(TimeRange.MONTH)}
        loadMore={makeLoadMore(TimeRange.MONTH)}
        playTrack={makePlayTrack(TimeRange.MONTH)}
        pauseTrack={makePauseTrack(TimeRange.MONTH)}
        endOfLineup={
          <EndOfLineup description={messages.endOfLineupDescription} />
        }
        actions={trendingMonthActions}
        {...mainLineupProps}
      />
    </div>,
    <div
      key={`all-time-trending-tracks-${trendingGenre}`}
      className={styles.lineupContainer}
    >
      <Lineup
        aria-label='all-time trending tracks'
        ordered
        {...allTimeProps}
        setInView={makeSetInView(TimeRange.ALL_TIME)}
        loadMore={makeLoadMore(TimeRange.ALL_TIME)}
        playTrack={makePlayTrack(TimeRange.ALL_TIME)}
        pauseTrack={makePauseTrack(TimeRange.ALL_TIME)}
        actions={trendingAllTimeActions}
        endOfLineup={
          <EndOfLineup description={messages.endOfLineupDescription} />
        }
        {...mainLineupProps}
      />
    </div>
  ]
  const record = useRecord()

  // Setup tabs
  const didChangeTabs = (from: string, to: string) => {
    setTrendingTimeRange(to as TimeRange)
    scrollToTop(to as TimeRange)
    record(
      make(Name.TRENDING_CHANGE_VIEW, {
        timeframe: to as TimeRange,
        genre: trendingGenre || ''
      })
    )
  }

  const tabIsDisabled = (timeRange: TimeRange) =>
    emptyTimeGenreSet.current.has(
      getTimeGenreCacheKey(timeRange, trendingGenre)
    )
  const { tabs, body } = useTabs({
    isMobile: false,
    tabs: [
      {
        text: messages.thisWeek,
        label: TimeRange.WEEK,
        disabled: tabIsDisabled(TimeRange.WEEK)
      },
      {
        text: messages.thisMonth,
        label: TimeRange.MONTH,
        disabled: tabIsDisabled(TimeRange.MONTH)
      },
      {
        text: messages.allTime,
        label: TimeRange.ALL_TIME,
        disabled: tabIsDisabled(TimeRange.ALL_TIME)
      }
    ],
    selectedTabLabel: trendingTimeRange,
    elements: trendingLineups,
    didChangeTabsFrom: didChangeTabs,
    bodyClassName: styles.tabBody,
    elementClassName: styles.tabElement,
    interElementSpacing: 100,
    disabledTabTooltipText: messages.disabledTabTooltip
  })

  const setGenre = useCallback(
    (genre: string | null) => {
      setGenreAndRefresh(genre)
      record(
        make(Name.TRENDING_CHANGE_VIEW, {
          timeframe: trendingTimeRange,
          genre: genre || ''
        })
      )
    },
    [setGenreAndRefresh, record, trendingTimeRange]
  )

  // Setup Modal
  const [modalIsOpen, setModalIsOpen] = useState(false)
  const didSelectModalGenre = (genre: string | null) => {
    const trimmedGenre =
      genre !== null ? genre.replace(ELECTRONIC_PREFIX, '') : genre
    setGenre(trimmedGenre)
    setModalIsOpen(false)
  }

  // Setup Header
  const header = (
    <Header
      icon={IconTrending}
      primary={trendingTitle}
      bottomBar={tabs}
      rightDecorator={
        <TrendingGenreFilters
          currentGenre={trendingGenre}
          didSelectGenre={setGenre}
          didSelectMore={() => setModalIsOpen(true)}
        />
      }
    />
  )

  return (
    <>
      <Page
        title={pageTitle}
        description={trendingDescription}
        size='large'
        header={header}
      >
        {body}
      </Page>
      <GenreSelectionModal
        genres={TRENDING_GENRES}
        selectedGenre={trendingGenre}
        didClose={() => {
          setModalIsOpen(false)
        }}
        didSelectGenre={didSelectModalGenre}
        isOpen={modalIsOpen}
      />
    </>
  )
}

export default TrendingPageContent
