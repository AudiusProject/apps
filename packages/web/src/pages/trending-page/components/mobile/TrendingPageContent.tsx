import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  getTrendingQueryKey,
  getTrendingUndergroundQueryKey,
  TRENDING_INITIAL_PAGE_SIZE,
  TRENDING_LOAD_MORE_PAGE_SIZE,
  useTrending,
  useTrendingUnderground
} from '@audius/common/api'
import { Name, TimeRange } from '@audius/common/models'
import {
  trendingPageActions,
  trendingPageSelectors
} from '@audius/common/store'
import {
  route,
  toTrendingGenre,
  toTrendingGenreValue
} from '@audius/common/utils'
import {
  FilterButton,
  Flex,
  IconCloseAlt,
  SelectablePill
} from '@audius/harmony'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import Header from 'components/header/mobile/Header'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import { EndOfLineup } from 'components/lineup/EndOfLineup'
import { TrackLineup } from 'components/lineup/TrackLineup'
import { LineupVariant } from 'components/lineup/types'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, {
  CenterPreset,
  LeftPreset,
  RightPreset
} from 'components/nav/mobile/NavContext'
import { WinnersView } from 'pages/trending-page/components/desktop/WinnersView'
import { TRENDING_MESSAGES } from 'pages/trending-page/constants'
import {
  updateWinnersWeekParam,
  isValidWinnersWeek,
  parseUrlParams,
  updateTimeRangeUrlParam,
  updateGenreUrlParam,
  isValidGenre,
  isValidTimeRange
} from 'pages/trending-page/utils'
import { push as pushRoute, replace as replaceRoute } from 'utils/navigation'
import { BASE_URL } from 'utils/route'
import { scrollWindowToTop } from 'utils/scroll'

import styles from './TrendingPageContent.module.css'

const { TRENDING_PAGE, TRENDING_GENRES: TRENDING_GENRES_ROUTE } = route
const { getTrendingGenre, getTrendingTimeRange } = trendingPageSelectors

const UNDERGROUND_PAGE_SIZE = 10

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

  const trendingGenre = useSelector(getTrendingGenre)
  const trendingTimeRange = useSelector(getTrendingTimeRange)

  const trendingArgs = useMemo(
    () => ({
      initialPageSize: TRENDING_INITIAL_PAGE_SIZE,
      loadMorePageSize: TRENDING_LOAD_MORE_PAGE_SIZE,
      genre: trendingGenre
    }),
    [trendingGenre]
  )
  const weekQuery = useTrending({ timeRange: TimeRange.WEEK, ...trendingArgs })
  const monthQuery = useTrending({
    timeRange: TimeRange.MONTH,
    ...trendingArgs
  })
  const allTimeQuery = useTrending({
    timeRange: TimeRange.ALL_TIME,
    ...trendingArgs
  })

  const undergroundQuery = useTrendingUnderground({
    pageSize: UNDERGROUND_PAGE_SIZE
  })
  const undergroundQuerySource = useMemo(
    () => ({
      queryKey: [
        ...getTrendingUndergroundQueryKey({ pageSize: UNDERGROUND_PAGE_SIZE })
      ] as unknown[]
    }),
    []
  )

  const replaceRouteCallback = useCallback(
    (r: { search: string }) => {
      dispatch(replaceRoute(r))
    },
    [dispatch]
  )

  const goToGenreSelection = useCallback(() => {
    dispatch(pushRoute(TRENDING_GENRES_ROUTE))
  }, [dispatch])

  // A `?genre=` in the URL is the user's intent for this visit and must win
  // over whatever genre an earlier trending visit left behind in redux —
  // otherwise arriving from Explore with `?genre=Jazz` silently keeps showing
  // the previous genre. With no genre in the URL, redux still wins so the last
  // filter is remembered (and gets written back to the URL by the sync effect
  // below).
  const genreFromUrlOnMount = useRef(parseUrlParams().genre)

  useEffect(() => {
    const { genre, timeRange } = parseUrlParams()
    if (isValidGenre(genre)) {
      dispatch(
        trendingPageActions.setTrendingGenre(toTrendingGenreValue(genre))
      )
    }
    if (isValidTimeRange(timeRange)) {
      dispatch(trendingPageActions.setTrendingTimeRange(timeRange as TimeRange))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    updateTimeRangeUrlParam(trendingTimeRange, replaceRouteCallback)
  }, [trendingTimeRange, replaceRouteCallback])
  useEffect(() => {
    // Skip the first run when the URL already carries the genre: redux has not
    // caught up with the effect above yet, and writing the stale value back
    // would clobber the incoming param.
    if (isValidGenre(genreFromUrlOnMount.current)) {
      genreFromUrlOnMount.current = null
      return
    }
    updateGenreUrlParam(trendingGenre, replaceRouteCallback)
  }, [trendingGenre, replaceRouteCallback])

  const { setLeft, setCenter, setRight } = useContext(NavContext)!
  useEffect(() => {
    setLeft(LeftPreset.NOTIFICATION)
    setRight(RightPreset.KEBAB)
    setCenter(CenterPreset.LOGO)
  }, [setLeft, setCenter, setRight])

  const record = useRecord()

  const setTrendingTimeRange = useCallback(
    (tr: TimeRange) => dispatch(trendingPageActions.setTrendingTimeRange(tr)),
    [dispatch]
  )
  const setTrendingGenre = useCallback(
    (genre: string | null) =>
      dispatch(trendingPageActions.setTrendingGenre(toTrendingGenre(genre))),
    [dispatch]
  )

  const handleTimeRangeChange = useCallback(
    (timeRange: TimeRange) => {
      setTrendingTimeRange(timeRange)
      scrollWindowToTop()
      record(
        make(Name.TRENDING_CHANGE_VIEW, {
          timeframe: timeRange,
          genre: trendingGenre ?? ''
        })
      )
    },
    [setTrendingTimeRange, record, trendingGenre]
  )

  const queryForRange = useCallback(
    (tr: TimeRange) => {
      if (tr === TimeRange.WEEK) return weekQuery
      if (tr === TimeRange.MONTH) return monthQuery
      return allTimeQuery
    },
    [weekQuery, monthQuery, allTimeQuery]
  )

  const querySourceFor = (timeRange: TimeRange) => ({
    queryKey: [
      ...getTrendingQueryKey({ timeRange, ...trendingArgs })
    ] as unknown[]
  })

  const sourceFor = (timeRange: TimeRange) => {
    if (timeRange === TimeRange.WEEK) return 'DISCOVER_TRENDING_WEEK'
    if (timeRange === TimeRange.MONTH) return 'DISCOVER_TRENDING_MONTH'
    return 'DISCOVER_TRENDING_ALL_TIME'
  }

  const getTracksLineupForRange = (timeRange: TimeRange) => {
    const q = queryForRange(timeRange)
    return (
      <TrackLineup
        key={`trending-${timeRange}-${trendingGenre ?? 'all'}`}
        aria-label={`${timeRange} trending tracks`}
        trackIds={q.trackIds}
        source={sourceFor(timeRange)}
        querySource={querySourceFor(timeRange)}
        ordered
        isTrending
        variant={LineupVariant.MAIN}
        isPending={q.isPending}
        isFetching={q.isFetching}
        isError={q.isError}
        hasNextPage={q.hasNextPage}
        loadNextPage={q.loadNextPage}
        pageSize={TRENDING_LOAD_MORE_PAGE_SIZE}
        initialPageSize={TRENDING_INITIAL_PAGE_SIZE}
        endOfLineupElement={
          <EndOfLineup description={messages.endOfLineupDescription} />
        }
      />
    )
  }

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
      ? trendingGenre
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
          updateWinnersWeekParam(week, replaceRouteCallback)
        }}
        onSubFilterChange={setWinnersSubFilter}
        containerRef={containerRef}
      />
    ) : (
      <div className={cn(styles.lineupContainer)}>
        <TrackLineup
          aria-label='underground trending tracks'
          trackIds={undergroundQuery.trackIds}
          source='DISCOVER_TRENDING_UNDERGROUND'
          querySource={undergroundQuerySource}
          isPending={undergroundQuery.isPending}
          isFetching={undergroundQuery.isFetching}
          isError={undergroundQuery.isError}
          hasNextPage={undergroundQuery.hasNextPage}
          loadNextPage={undergroundQuery.loadNextPage}
          pageSize={UNDERGROUND_PAGE_SIZE}
          ordered
          isTrending
          variant={LineupVariant.MAIN}
          endOfLineupElement={
            <EndOfLineup description={messages.endOfLineupDescription} />
          }
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
