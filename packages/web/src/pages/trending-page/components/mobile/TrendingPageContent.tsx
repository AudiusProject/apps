import { useCallback, useContext, useEffect, useMemo } from 'react'

import {
  TRENDING_INITIAL_PAGE_SIZE,
  TRENDING_LOAD_MORE_PAGE_SIZE,
  useTrending
} from '@audius/common/api'
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
import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import { LineupVariant } from 'components/lineup/types'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, {
  CenterPreset,
  LeftPreset,
  RightPreset
} from 'components/nav/mobile/NavContext'
import useTabs from 'hooks/useTabs/useTabs'
import { TrendingPageContentProps } from 'pages/trending-page/types'
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

const TrendingPageMobileContent = ({
  pageTitle,
  trendingDescription,
  trendingTimeRange,
  setTrendingTimeRange,
  makeSetInView,
  trendingGenre,
  goToGenreSelection
}: TrendingPageContentProps) => {
  const {
    data,
    isFetching,
    isPending,
    isError,
    hasNextPage,
    play,
    pause,
    loadNextPage,
    isPlaying,
    lineup
  } = useTrending({
    timeRange: trendingTimeRange,
    genre: trendingGenre || undefined
  })
  // Set Nav-Bar Menu
  const { setLeft, setCenter, setRight } = useContext(NavContext)!
  useEffect(() => {
    setLeft(LeftPreset.NOTIFICATION)
    setRight(RightPreset.SEARCH)
    setCenter(CenterPreset.LOGO)
  }, [setLeft, setCenter, setRight])

  const lineups = useMemo(() => {
    return [
      <>
        {trendingGenre === null ? (
          <div className={styles.rewardsContainer}>
            <RewardsBanner bannerType='tracks' />
          </div>
        ) : null}
        <TanQueryLineup
          data={data}
          isFetching={isFetching}
          isPending={isPending}
          isError={isError}
          hasNextPage={hasNextPage}
          play={play}
          pause={pause}
          loadNextPage={loadNextPage}
          isPlaying={isPlaying}
          lineup={lineup}
          key={`trendingWeek-${trendingGenre}`}
          pageSize={TRENDING_LOAD_MORE_PAGE_SIZE}
          initialPageSize={TRENDING_INITIAL_PAGE_SIZE}
          actions={trendingWeekActions}
          variant={LineupVariant.MAIN}
          isTrending
          endOfLineupElement={
            <EndOfLineup description={messages.endOfLineupDescription} />
          }
        />
      </>,
      <TanQueryLineup
        data={data}
        isFetching={isFetching}
        isPending={isPending}
        isError={isError}
        hasNextPage={hasNextPage}
        play={play}
        pause={pause}
        loadNextPage={loadNextPage}
        isPlaying={isPlaying}
        lineup={lineup}
        key={`trendingMonth-${trendingGenre}`}
        pageSize={TRENDING_LOAD_MORE_PAGE_SIZE}
        initialPageSize={TRENDING_INITIAL_PAGE_SIZE}
        actions={trendingMonthActions}
        variant={LineupVariant.MAIN}
        isTrending
        endOfLineupElement={
          <EndOfLineup description={messages.endOfLineupDescription} />
        }
      />,
      <TanQueryLineup
        data={data}
        isFetching={isFetching}
        isPending={isPending}
        isError={isError}
        hasNextPage={hasNextPage}
        play={play}
        pause={pause}
        loadNextPage={loadNextPage}
        isPlaying={isPlaying}
        lineup={lineup}
        key={`trendingAllTime-${trendingGenre}`}
        pageSize={TRENDING_LOAD_MORE_PAGE_SIZE}
        initialPageSize={TRENDING_INITIAL_PAGE_SIZE}
        actions={trendingAllTimeActions}
        variant={LineupVariant.MAIN}
        isTrending
        endOfLineupElement={
          <EndOfLineup description={messages.endOfLineupDescription} />
        }
      />
    ]
  }, [
    trendingGenre,
    data,
    isFetching,
    isPending,
    isError,
    hasNextPage,
    play,
    pause,
    loadNextPage,
    isPlaying,
    lineup
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
    return lineups.map((lineup, i) => (
      <div key={i} className={cn(styles.lineupContainer)}>
        {lineup}
      </div>
    ))
  }, [lineups])

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
      title={pageTitle}
      description={trendingDescription}
      canonicalUrl={`${BASE_URL}${TRENDING_PAGE}`}
    >
      <div className={styles.tabsContainer}>
        <div className={styles.tabBodyHolder}>{body}</div>
      </div>
    </MobilePageContainer>
  )
}

export default TrendingPageMobileContent
