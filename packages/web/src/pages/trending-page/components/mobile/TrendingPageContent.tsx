import { useCallback, useContext, useEffect, useMemo } from 'react'

import { Name, TimeRange } from '@audius/common/models'
import { trendingPageLineupActions } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  IconAllTime,
  IconCalendarDay as IconDay,
  IconCalendarMonth as IconMonth
} from '@audius/harmony'
import cn from 'classnames'

import { make, useRecord } from 'common/store/analytics/actions'
import Header from 'components/header/mobile/Header'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import { EndOfLineup } from 'components/lineup/EndOfLineup'
import Lineup from 'components/lineup/Lineup'
import { LineupVariant } from 'components/lineup/types'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, {
  CenterPreset,
  LeftPreset,
  RightPreset
} from 'components/nav/mobile/NavContext'
import useTabs from 'hooks/useTabs/useTabs'
import { TRENDING_MESSAGES } from 'pages/trending-page/constants'
import { useTrendingActions } from 'pages/trending-page/hooks/useTrendingActions'
import { useTrendingLineups } from 'pages/trending-page/hooks/useTrendingLineups'
import { useTrendingPageCleanup } from 'pages/trending-page/hooks/useTrendingPageCleanup'
import { useTrendingPageState } from 'pages/trending-page/hooks/useTrendingPageState'
import { useTrendingUrlParams } from 'pages/trending-page/hooks/useTrendingUrlParams'
import { BASE_URL } from 'utils/route'
import { scrollWindowToTop } from 'utils/scroll'

import RewardsBanner from '../RewardsBanner'

import TrendingFilterButton from './TrendingFilterButton'
import styles from './TrendingPageContent.module.css'
const { TRENDING_PAGE } = route
const { trendingAllTimeActions, trendingMonthActions, trendingWeekActions } =
  trendingPageLineupActions

const messages = {
  title: 'Trending',
  thisWeek: 'This Week',
  thisMonth: 'This Month',
  allTime: 'All Time',
  endOfLineupDescription: "Looks like you've reached the end of this list..."
}

const tabHeaders = [
  { icon: <IconDay />, text: messages.thisWeek, label: TimeRange.WEEK },
  { icon: <IconMonth />, text: messages.thisMonth, label: TimeRange.MONTH },
  { icon: <IconAllTime />, text: messages.allTime, label: TimeRange.ALL_TIME }
]

type TrendingPageMobileContentProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

const TrendingPageMobileContent = ({
  containerRef
}: TrendingPageMobileContentProps) => {
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

  const { trendingWeek, trendingMonth, trendingAllTime, getLineupProps } =
    lineups
  const { trendingGenre, trendingTimeRange } = trendingPageState
  const {
    makeLoadMore,
    makePlayTrack,
    makePauseTrack,
    makeSetInView,
    setTrendingTimeRange,
    goToGenreSelection
  } = actions
  // Set Nav-Bar Menu
  const { setLeft, setCenter, setRight } = useContext(NavContext)!
  useEffect(() => {
    setLeft(LeftPreset.NOTIFICATION)
    setRight(RightPreset.KEBAB)
    setCenter(CenterPreset.LOGO)
  }, [setLeft, setCenter, setRight])

  // Setup lineups
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

  const lineupElements = useMemo(() => {
    return [
      <>
        {trendingGenre === null ? (
          <div className={styles.rewardsContainer}>
            <RewardsBanner bannerType='tracks' />
          </div>
        ) : null}
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
      </>,
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
      />,
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
    ]
  }, [
    makeLoadMore,
    makePauseTrack,
    makePlayTrack,
    makeSetInView,
    monthProps,
    weekProps,
    allTimeProps,
    trendingGenre
  ])
  const record = useRecord()

  const didChangeTabs = useCallback(
    (from: string, to: string) => {
      if (from === to) return
      setTrendingTimeRange(to as TimeRange)

      // Fo the mobile layout scroll the document element, not the lineup container
      scrollWindowToTop()

      // Manually setInView
      makeSetInView(to as TimeRange)(true)
      makeSetInView(from as TimeRange)(false)
      if (from !== to)
        record(
          make(Name.TRENDING_CHANGE_VIEW, {
            timeframe: to as TimeRange,
            genre: trendingGenre || ''
          })
        )
    },
    [setTrendingTimeRange, makeSetInView, record, trendingGenre]
  )

  const memoizedElements = useMemo(() => {
    return lineupElements.map((lineup, i) => (
      <div key={i} className={cn(styles.lineupContainer)}>
        {lineup}
      </div>
    ))
  }, [lineupElements])

  const { tabs, body } = useTabs({
    tabs: tabHeaders,
    elements: memoizedElements,
    initialTab: trendingTimeRange,
    selectedTabLabel: trendingTimeRange,
    didChangeTabsFrom: didChangeTabs
  })

  const { setHeader } = useContext(HeaderContext)
  useEffect(() => {
    setHeader(
      <>
        <Header title={messages.title} className={styles.header}>
          <TrendingFilterButton
            selectedGenre={trendingGenre}
            onClick={goToGenreSelection}
          />
        </Header>
        <div className={styles.tabBarHolder}>{tabs}</div>
      </>
    )
  }, [setHeader, trendingGenre, goToGenreSelection, tabs])

  return (
    <MobilePageContainer
      title={TRENDING_MESSAGES.pageTitle}
      description={TRENDING_MESSAGES.trendingDescription}
      canonicalUrl={`${BASE_URL}${TRENDING_PAGE}`}
    >
      <div className={styles.tabsContainer}>
        <div className={styles.tabBodyHolder}>{body}</div>
      </div>
    </MobilePageContainer>
  )
}

export default TrendingPageMobileContent
