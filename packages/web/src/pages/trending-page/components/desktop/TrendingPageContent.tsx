import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  getTrendingQueryKey,
  getTrendingUndergroundQueryKey,
  TRENDING_INITIAL_PAGE_SIZE,
  useTrending,
  useTrendingUnderground,
  usePopularGenres
} from '@audius/common/api'
import { Name, TimeRange } from '@audius/common/models'
import {
  trendingPageActions,
  trendingPageSelectors
} from '@audius/common/store'
import { route, toTrendingGenreValue } from '@audius/common/utils'
import {
  FilterButton,
  Flex,
  IconTrending,
  SelectablePill
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { make, useRecord } from 'common/store/analytics/actions'
import { openSignOn } from 'common/store/pages/signon/actions'
import { MIN_DESKTOP_CONTENT_WIDTH_PX } from 'common/utils/layout'
import { Header } from 'components/header/desktop/Header'
import EndOfLineup from 'components/lineup/EndOfLineup'
import { TrackLineup } from 'components/lineup/TrackLineup'
import { LineupVariant } from 'components/lineup/types'
import Page from 'components/page/Page'
import { useIsContainerNarrow } from 'hooks/useIsContainerNarrow'
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

const { getTrendingGenre, getTrendingTimeRange } = trendingPageSelectors

const messages = {
  tracks: 'Tracks',
  underground: 'Underground',
  winners: 'Winners',
  thisWeek: 'This Week',
  thisMonth: 'This Month',
  allTime: 'All Time',
  allGenres: 'All Genres',
  searchGenres: 'Search Genres',
  genres: 'Genres',
  endOfLineupDescription: "Looks like you've reached the end of this list..."
}

type TrendingCategory = 'tracks' | 'underground' | 'winners'

type TrendingPageContentProps = {
  containerRef?: React.RefObject<HTMLDivElement>
}

// Keeps track of (timeRange,genre) combinations known to be empty so we can
// skip to the next non-empty tab without re-fetching.
const getTimeGenreCacheKey = (timeRange: TimeRange, genre: string | null) =>
  `${timeRange}-${genre || 'all'}`

const getRangesToDisable = (timeRange: TimeRange): TimeRange[] => {
  switch (timeRange) {
    case TimeRange.ALL_TIME:
    case TimeRange.MONTH:
      return [TimeRange.MONTH, TimeRange.WEEK]
    case TimeRange.WEEK:
      return [TimeRange.WEEK]
  }
}

const UNDERGROUND_PAGE_SIZE = 10

const TrendingPageContent = ({ containerRef }: TrendingPageContentProps) => {
  const dispatch = useDispatch()
  const bottomBarRef = useRef<HTMLDivElement>(null)
  const isCondensedBar = useIsContainerNarrow(bottomBarRef, 640)

  const [category, setCategoryState] = useState<TrendingCategory>(() => {
    const { week } = parseUrlParams()
    return isValidWinnersWeek(week) ? 'winners' : 'tracks'
  })
  const setCategory = useCallback(
    (next: TrendingCategory) => {
      // Switching category swaps the lineup underneath the user, but the
      // outer scroll parent (mainContent) keeps its position. Reset to top
      // so the new category starts from the top instead of mid-scroll.
      if (containerRef?.current?.scrollTo) {
        containerRef.current.scrollTo(0, 0)
      }
      setCategoryState(next)
    },
    [containerRef]
  )
  const [winnersWeek, setWinnersWeek] = useState<string | null>(() => {
    const { week } = parseUrlParams()
    return isValidWinnersWeek(week) ? week : null
  })
  const [winnersSubFilter, setWinnersSubFilter] = useState<
    'tracks' | 'underground'
  >('tracks')

  const trendingGenre = useSelector(getTrendingGenre)
  const trendingTimeRange = useSelector(getTrendingTimeRange)
  const { data: genreSuggestions = [] } = usePopularGenres()

  // Desktop viewports + fast trackpad / wheel scroll need bigger pages than
  // the shared default (mobile-tuned) so successive load-mores keep up with a
  // user scrolling deep into the lineup.
  const desktopLoadMorePageSize = 10

  // ----- Three tanquery streams, one per time range -----
  const trendingArgs = useMemo(
    () => ({
      initialPageSize: TRENDING_INITIAL_PAGE_SIZE,
      loadMorePageSize: desktopLoadMorePageSize,
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

  // ----- URL param sync ------------------------------------------------------
  const replaceRouteCallback = useCallback(
    (route: { search: string }) => {
      dispatch(replaceRoute(route))
    },
    [dispatch]
  )

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

  const { trendingTitle, pageTitle, trendingDescription } = TRENDING_MESSAGES
  const record = useRecord()

  // ----- Tab logic -----------------------------------------------------------
  const queryForRange = useCallback(
    (tr: TimeRange) => {
      if (tr === TimeRange.WEEK) return weekQuery
      if (tr === TimeRange.MONTH) return monthQuery
      return allTimeQuery
    },
    [weekQuery, monthQuery, allTimeQuery]
  )

  const emptyTimeGenreSet = useRef(new Set<string>())
  const cacheKey = getTimeGenreCacheKey(trendingTimeRange, trendingGenre)
  const currentQuery = queryForRange(trendingTimeRange)

  // If a time range resolves empty (for the current genre), auto-advance to
  // a richer tab.
  const shouldMoveToNextTab =
    (emptyTimeGenreSet.current.has(cacheKey) && !currentQuery.isFetching) ||
    (currentQuery.isSuccess &&
      currentQuery.trackIds.length === 0 &&
      trendingGenre !== null)

  const setTrendingTimeRange = useCallback(
    (tr: TimeRange) => {
      dispatch(trendingPageActions.setTrendingTimeRange(tr))
    },
    [dispatch]
  )

  const setTrendingGenre = useCallback(
    (genre: string | null) => {
      // toTrendingGenreValue keeps freeform/community genres (from the dynamic
      // popular-genres filter) while mapping the all-genres sentinel to null.
      dispatch(
        trendingPageActions.setTrendingGenre(toTrendingGenreValue(genre))
      )
    },
    [dispatch]
  )

  if (shouldMoveToNextTab) {
    // Mark every equally-or-more-restrictive range empty so we don't bounce.
    getRangesToDisable(trendingTimeRange)
      .map((r) => getTimeGenreCacheKey(r, trendingGenre))
      .forEach((k) => emptyTimeGenreSet.current.add(k))

    switch (trendingTimeRange) {
      case TimeRange.WEEK: {
        const monthAlsoEmpty = emptyTimeGenreSet.current.has(
          getTimeGenreCacheKey(TimeRange.MONTH, trendingGenre)
        )
        setTrendingTimeRange(
          monthAlsoEmpty ? TimeRange.ALL_TIME : TimeRange.MONTH
        )
        break
      }
      case TimeRange.MONTH:
        setTrendingTimeRange(TimeRange.ALL_TIME)
        break
      case TimeRange.ALL_TIME:
      default:
        break
    }
  }

  const handleTimeRangeChange = useCallback(
    (value: string) => {
      const tr = value as TimeRange
      setTrendingTimeRange(tr)
      record(
        make(Name.TRENDING_CHANGE_VIEW, {
          timeframe: tr,
          genre: trendingGenre ?? ''
        })
      )
    },
    [setTrendingTimeRange, record, trendingGenre]
  )

  const handleGenreChange = useCallback(
    (value: string) => {
      const next = value === 'all' ? null : value
      setTrendingGenre(next)
      record(
        make(Name.TRENDING_CHANGE_VIEW, {
          timeframe: trendingTimeRange,
          genre: next ?? ''
        })
      )
    },
    [setTrendingGenre, record, trendingTimeRange]
  )

  const timeRangeOptions = [
    { label: messages.thisWeek, value: TimeRange.WEEK },
    { label: messages.thisMonth, value: TimeRange.MONTH },
    { label: messages.allTime, value: TimeRange.ALL_TIME }
  ]

  // Popular genres (ranked by recent activity) lead the list, followed by the
  // long-tail static genres; all are searchable via the filter input.
  const genreOptions = [
    { label: messages.allGenres, value: 'all' },
    ...genreSuggestions.map((g) => ({
      label: g.label,
      value: g.value
    }))
  ]

  const categoryOptions = [
    { label: messages.tracks, value: 'tracks' as TrendingCategory },
    { label: messages.underground, value: 'underground' as TrendingCategory },
    { label: messages.winners, value: 'winners' as TrendingCategory }
  ]

  const bottomBar = (
    <div ref={bottomBarRef} style={{ width: '100%' }}>
      {isCondensedBar ? (
        <Flex w='100%' alignItems='center' gap='s' pb='l'>
          <FilterButton
            label={messages.tracks}
            value={category}
            variant='replaceLabel'
            onChange={(value) => setCategory(value as TrendingCategory)}
            options={categoryOptions}
          />
          {category === 'tracks' ? (
            <>
              <FilterButton
                label={messages.thisWeek}
                value={trendingTimeRange}
                variant='replaceLabel'
                onChange={handleTimeRangeChange}
                options={timeRangeOptions}
              />
              <FilterButton
                label={messages.allGenres}
                value={trendingGenre ?? 'all'}
                variant='replaceLabel'
                onChange={handleGenreChange}
                options={genreOptions}
                showFilterInput
                filterInputProps={{
                  label: messages.searchGenres,
                  placeholder: messages.searchGenres
                }}
                virtualized
                menuProps={{ maxHeight: 320, width: 240 }}
              />
            </>
          ) : null}
        </Flex>
      ) : (
        <Flex
          w='100%'
          alignItems='center'
          justifyContent='space-between'
          gap='m'
          pb='l'
        >
          <Flex gap='s' role='tablist'>
            <SelectablePill
              type='button'
              label={messages.tracks}
              size='large'
              isSelected={category === 'tracks'}
              onClick={() => setCategory('tracks')}
            />
            <SelectablePill
              type='button'
              label={messages.underground}
              size='large'
              isSelected={category === 'underground'}
              onClick={() => setCategory('underground')}
            />
            <SelectablePill
              type='button'
              label={messages.winners}
              size='large'
              isSelected={category === 'winners'}
              onClick={() => setCategory('winners')}
            />
          </Flex>
          {category === 'tracks' ? (
            <Flex gap='s' alignItems='center'>
              <FilterButton
                label={messages.thisWeek}
                value={trendingTimeRange}
                variant='replaceLabel'
                onChange={handleTimeRangeChange}
                options={timeRangeOptions}
              />
              <FilterButton
                label={messages.allGenres}
                value={trendingGenre ?? 'all'}
                variant='replaceLabel'
                onChange={handleGenreChange}
                options={genreOptions}
                showFilterInput
                filterInputProps={{
                  label: messages.searchGenres,
                  placeholder: messages.searchGenres
                }}
                virtualized
                menuProps={{ maxHeight: 320, width: 240 }}
              />
            </Flex>
          ) : category === 'winners' ? (
            <Flex gap='2xs' alignItems='center' />
          ) : null}
        </Flex>
      )}
    </div>
  )

  const header = (
    <Header icon={IconTrending} primary={trendingTitle} bottomBar={bottomBar} />
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
        pageSize={desktopLoadMorePageSize}
        initialPageSize={TRENDING_INITIAL_PAGE_SIZE}
        scrollParent={containerRef?.current ?? null}
        endOfLineupElement={
          <EndOfLineup description={messages.endOfLineupDescription} />
        }
      />
    )
  }

  const goToSignUp = useCallback(() => {
    dispatch(openSignOn(false))
  }, [dispatch])
  // Preserve shape of previous actions export for WinnersView which may use it
  const actions = useMemo(
    () => ({
      replaceRoute: replaceRouteCallback,
      goToSignUp,
      goToGenreSelection: () => dispatch(pushRoute(route.TRENDING_GENRES))
    }),
    [replaceRouteCallback, goToSignUp, dispatch]
  )

  const pageContent =
    category === 'tracks' ? (
      getTracksLineupForRange(trendingTimeRange)
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
        scrollParent={containerRef?.current ?? null}
        endOfLineupElement={
          <EndOfLineup description={messages.endOfLineupDescription} />
        }
      />
    )

  return (
    <Page
      title={pageTitle}
      description={trendingDescription}
      size='large'
      header={header}
    >
      <Flex w='100%' css={{ minWidth: MIN_DESKTOP_CONTENT_WIDTH_PX }}>
        {pageContent}
      </Flex>
    </Page>
  )
}

export default TrendingPageContent
