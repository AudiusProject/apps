import { useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { Name, TimeRange } from '@audius/common/models'
import {
  trendingPageLineupActions,
  trendingUndergroundPageLineupActions,
  trendingUndergroundPageLineupSelectors
} from '@audius/common/store'
import { getCanonicalName, route } from '@audius/common/utils'
import {
  FilterButton,
  Flex,
  IconCloseAlt,
  SelectablePill
} from '@audius/harmony'
import cn from 'classnames'
import { useDispatch } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import Header from 'components/header/mobile/Header'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import { EndOfLineup } from 'components/lineup/EndOfLineup'
import Lineup from 'components/lineup/Lineup'
import { useLineupProps } from 'components/lineup/hooks'
import { LineupVariant } from 'components/lineup/types'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, {
  CenterPreset,
  LeftPreset,
  RightPreset
} from 'components/nav/mobile/NavContext'
import { WinnersView } from 'pages/trending-page/components/desktop/WinnersView'
import { TRENDING_MESSAGES } from 'pages/trending-page/constants'
import { useTrendingActions } from 'pages/trending-page/hooks/useTrendingActions'
import { useTrendingLineups } from 'pages/trending-page/hooks/useTrendingLineups'
import { useTrendingPageCleanup } from 'pages/trending-page/hooks/useTrendingPageCleanup'
import { useTrendingPageState } from 'pages/trending-page/hooks/useTrendingPageState'
import { useTrendingUrlParams } from 'pages/trending-page/hooks/useTrendingUrlParams'
import {
  updateWinnersWeekParam,
  isValidWinnersWeek,
  parseUrlParams
} from 'pages/trending-page/utils'
import { BASE_URL } from 'utils/route'
import { scrollWindowToTop } from 'utils/scroll'

import styles from './TrendingPageContent.module.css'
const { TRENDING_PAGE } = route
const { trendingAllTimeActions, trendingMonthActions, trendingWeekActions } =
  trendingPageLineupActions
const { getLineup } = trendingUndergroundPageLineupSelectors

const messages = {
  trending: 'Trending',
  underground: 'Underground',
  winners: 'Winners',
  tracks: 'Tracks',
  thisWeek: 'This Week',
  thisMonth: 'This Month',
  allTime: 'All Time',
  genre: 'Genre',
  allGenres: 'All Genres',
  endOfLineupDescription: "Looks like you've reached the end of this list..."
}

type TrendingCategory = 'tracks' | 'underground' | 'winners'

type TrendingPageMobileContentProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

const useTrendingUndergroundLineup = (
  scrollParent: HTMLElement | undefined
) => {
  return useLineupProps({
    actions: trendingUndergroundPageLineupActions,
    getLineupSelector: getLineup,
    variant: LineupVariant.MAIN,
    scrollParent: scrollParent ?? undefined,
    isTrending: true,
    isOrdered: true
  })
}

const TrendingPageMobileContent = ({
  containerRef
}: TrendingPageMobileContentProps) => {
  const dispatch = useDispatch()
  const [category, setCategory] = useState<TrendingCategory>(() => {
    const { week } = parseUrlParams()
    return isValidWinnersWeek(week) ? 'winners' : 'tracks'
  })
  const [winnersWeek, setWinnersWeek] = useState<string | null>(() => {
    const { week } = parseUrlParams()
    return isValidWinnersWeek(week) ? week : null
  })
  const [winnersSubFilter, setWinnersSubFilter] = useState<
    'tracks' | 'underground'
  >('tracks')

  const trendingPageState = useTrendingPageState()
  const actions = useTrendingActions()
  const lineups = useTrendingLineups({
    trendingPageState,
    containerRef: containerRef ?? undefined
  })
  const undergroundLineupProps = useTrendingUndergroundLineup(
    containerRef?.current ?? undefined
  )

  useTrendingUrlParams({
    trendingPageState,
    setTrendingGenre: actions.setTrendingGenre,
    setTrendingTimeRange: actions.setTrendingTimeRange,
    replaceRoute: actions.replaceRoute
  })

  useTrendingPageCleanup({ trendingPageState, actions })

  useEffect(() => {
    if (category === 'winners') {
      const { week } = parseUrlParams()
      if (isValidWinnersWeek(week)) {
        setWinnersWeek(week)
      }
    }
  }, [category])

  useEffect(() => {
    return () => {
      dispatch(trendingUndergroundPageLineupActions.reset())
    }
  }, [dispatch])

  const { trendingWeek, trendingMonth, trendingAllTime, getLineupProps } =
    lineups
  const { trendingGenre, trendingTimeRange } = trendingPageState
  const {
    makeLoadMore,
    makePlayTrack,
    makePauseTrack,
    makeSetInView,
    setTrendingTimeRange,
    setTrendingGenre,
    goToGenreSelection
  } = actions

  const { setLeft, setCenter, setRight } = useContext(NavContext)!
  useEffect(() => {
    setLeft(LeftPreset.NOTIFICATION)
    setRight(RightPreset.KEBAB)
    setCenter(CenterPreset.LOGO)
  }, [setLeft, setCenter, setRight])

  const weekProps = useMemo(
    () => getLineupProps(trendingWeek),
    [getLineupProps, trendingWeek]
  )
  const monthProps = useMemo(
    () => getLineupProps(trendingMonth),
    [getLineupProps, trendingMonth]
  )
  const allTimeProps = useMemo(
    () => getLineupProps(trendingAllTime),
    [getLineupProps, trendingAllTime]
  )

  const record = useRecord()

  const handleTimeRangeChange = useCallback(
    (timeRange: TimeRange) => {
      setTrendingTimeRange(timeRange)
      scrollWindowToTop()
      makeSetInView(timeRange)(true)
      ;[TimeRange.WEEK, TimeRange.MONTH, TimeRange.ALL_TIME].forEach((tr) => {
        if (tr !== timeRange) makeSetInView(tr)(false)
      })
      record(
        make(Name.TRENDING_CHANGE_VIEW, {
          timeframe: timeRange,
          genre: trendingGenre ?? ''
        })
      )
    },
    [setTrendingTimeRange, makeSetInView, record, trendingGenre]
  )

  const getTracksLineupForRange = useCallback(
    (timeRange: TimeRange) => {
      const lineupMap = {
        [TimeRange.WEEK]: (
          <Lineup
            key={`trendingWeek-${trendingGenre}`}
            {...weekProps}
            setInView={makeSetInView(TimeRange.WEEK)}
            loadMore={makeLoadMore(TimeRange.WEEK)}
            playTrack={makePlayTrack(TimeRange.WEEK)}
            pauseTrack={makePauseTrack(TimeRange.WEEK)}
            actions={trendingWeekActions}
            variant={LineupVariant.MAIN}
            isTrending
            endOfLineup={
              <EndOfLineup description={messages.endOfLineupDescription} />
            }
          />
        ),
        [TimeRange.MONTH]: (
          <Lineup
            key={`trendingMonth-${trendingGenre}`}
            {...monthProps}
            setInView={makeSetInView(TimeRange.MONTH)}
            loadMore={makeLoadMore(TimeRange.MONTH)}
            playTrack={makePlayTrack(TimeRange.MONTH)}
            pauseTrack={makePauseTrack(TimeRange.MONTH)}
            actions={trendingMonthActions}
            variant={LineupVariant.MAIN}
            isTrending
            endOfLineup={
              <EndOfLineup description={messages.endOfLineupDescription} />
            }
          />
        ),
        [TimeRange.ALL_TIME]: (
          <Lineup
            key={`trendingAllTime-${trendingGenre}`}
            {...allTimeProps}
            setInView={makeSetInView(TimeRange.ALL_TIME)}
            loadMore={makeLoadMore(TimeRange.ALL_TIME)}
            playTrack={makePlayTrack(TimeRange.ALL_TIME)}
            pauseTrack={makePauseTrack(TimeRange.ALL_TIME)}
            actions={trendingAllTimeActions}
            variant={LineupVariant.MAIN}
            isTrending
            endOfLineup={
              <EndOfLineup description={messages.endOfLineupDescription} />
            }
          />
        )
      }
      return lineupMap[timeRange]
    },
    [
      weekProps,
      monthProps,
      allTimeProps,
      trendingGenre,
      makeSetInView,
      makeLoadMore,
      makePlayTrack,
      makePauseTrack
    ]
  )

  const timeRangeOptions = useMemo(
    () => [
      { value: TimeRange.WEEK, label: messages.thisWeek },
      { value: TimeRange.MONTH, label: messages.thisMonth },
      { value: TimeRange.ALL_TIME, label: messages.allTime }
    ],
    []
  )

  const categoryOptions = useMemo(
    () => [
      { value: 'tracks' as const, label: messages.tracks },
      { value: 'underground' as const, label: messages.underground },
      { value: 'winners' as const, label: messages.winners }
    ],
    []
  )

  const handleCategoryChange = useCallback((value: string) => {
    setCategory(value as TrendingCategory)
  }, [])

  const genreLabel =
    trendingGenre !== null && trendingGenre !== undefined
      ? getCanonicalName(trendingGenre)
      : messages.allGenres

  const isGenreSelected = trendingGenre !== null && trendingGenre !== undefined

  const handleGenrePillClick = useCallback(() => {
    if (isGenreSelected) {
      setTrendingGenre(null)
    } else {
      goToGenreSelection()
    }
  }, [isGenreSelected, setTrendingGenre, goToGenreSelection])

  const { setHeader } = useContext(HeaderContext)
  useEffect(() => {
    setHeader(
      <Header title={messages.trending} className={styles.header}>
        <Flex gap='s' alignItems='center' justifyContent='flex-end'>
          <FilterButton
            label={messages.tracks}
            value={category}
            variant='replaceLabel'
            onChange={handleCategoryChange}
            options={categoryOptions}
            size='small'
          />
        </Flex>
      </Header>
    )
  }, [setHeader, category, handleCategoryChange, categoryOptions])

  const content =
    category === 'tracks' ? (
      <div className={cn(styles.lineupContainer)}>
        {getTracksLineupForRange(trendingTimeRange)}
      </div>
    ) : category === 'winners' ? (
      <WinnersView
        week={winnersWeek}
        subFilter={winnersSubFilter}
        onWeekChange={(week) => {
          setWinnersWeek(week)
          updateWinnersWeekParam(week, actions.replaceRoute)
        }}
        onSubFilterChange={setWinnersSubFilter}
        containerRef={containerRef}
      />
    ) : (
      <div className={cn(styles.lineupContainer)}>
        <Lineup
          aria-label='underground trending tracks'
          {...undergroundLineupProps}
          endOfLineup={
            <EndOfLineup description={messages.endOfLineupDescription} />
          }
          variant={LineupVariant.MAIN}
        />
      </div>
    )

  return (
    <>
      {category === 'tracks' ? (
        <div className={styles.filterRow}>
          <FilterButton
            label={messages.thisWeek}
            value={trendingTimeRange}
            variant='replaceLabel'
            onChange={(value) => handleTimeRangeChange(value as TimeRange)}
            options={timeRangeOptions}
            size='small'
          />
          <SelectablePill
            type='button'
            size='large'
            label={genreLabel ?? ''}
            isSelected={isGenreSelected}
            icon={isGenreSelected ? IconCloseAlt : undefined}
            onClick={handleGenrePillClick}
            aria-label='Filter by genre'
          />
        </div>
      ) : null}
      <MobilePageContainer
        title={TRENDING_MESSAGES.pageTitle}
        description={TRENDING_MESSAGES.trendingDescription}
        canonicalUrl={`${BASE_URL}${TRENDING_PAGE}`}
      >
        <div className={styles.tabsContainer}>
          <div
            className={cn(
              styles.tabBodyHolder,
              category === 'tracks' && styles.hasFilterRow
            )}
          >
            {content}
          </div>
        </div>
      </MobilePageContainer>
    </>
  )
}

export default TrendingPageMobileContent
