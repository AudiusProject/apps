import { useCallback, useMemo } from 'react'

import {
  getTrendingWinnersQueryKey,
  useTrendingWinners
} from '@audius/common/api'
import { dayjs } from '@audius/common/utils'
import { ScrollView, View } from 'react-native'

import {
  Flex,
  IconButton,
  IconCalendarMonth,
  IconCaretLeft,
  IconCaretRight,
  Paper,
  SelectablePill,
  Text
} from '@audius/harmony-native'
import { TrackLineup } from 'app/components/lineup/TrackLineup'
import { LineupTileSkeleton } from 'app/components/lineup-tile'
import { makeStyles } from 'app/styles'

const messages = {
  header: 'Winners',
  subtitle: 'Artists trending Friday at 12PM PT win 1,000 $AUDIO',
  tracks: 'Tracks',
  undergroundTracks: 'Underground',
  lastFriday: 'Last Friday'
}

type WinnersSubFilter = 'tracks' | 'underground'

const WEEK_FORMAT = 'YYYY-MM-DD'

const getLastCompletedFriday = () => {
  const now = dayjs().utc()
  let lastFriday = now.day(5)
  if (lastFriday.isAfter(now)) {
    lastFriday = lastFriday.subtract(1, 'week')
  }
  return lastFriday
}

const formatWeekLabel = (week: string | null): string => {
  if (!week) return messages.lastFriday
  const d = dayjs(week + 'T12:00:00Z')
  return d.format('MMM D')
}

export type TrendingWinnersViewProps = {
  week: string | null
  subFilter: WinnersSubFilter
  onWeekChange: (week: string | null) => void
  onSubFilterChange: (filter: 'tracks' | 'underground') => void
}

export const TrendingWinnersView = ({
  week,
  subFilter,
  onWeekChange,
  onSubFilterChange
}: TrendingWinnersViewProps) => {
  const { data: tracks, isPending } = useTrendingWinners(
    {
      week,
      type: subFilter
    },
    { enabled: true }
  )
  const trackIds = useMemo(
    () => (tracks ?? []).map((t) => t.track_id),
    [tracks]
  )
  const querySource = useMemo(
    () => ({
      queryKey: [
        ...getTrendingWinnersQueryKey({ week, type: subFilter })
      ] as unknown[]
    }),
    [week, subFilter]
  )

  const handlePrevWeek = useCallback(() => {
    const base = week ? dayjs(week + 'T12:00:00Z') : getLastCompletedFriday()
    const prev = base.subtract(7, 'day').format(WEEK_FORMAT)
    onWeekChange(prev)
  }, [week, onWeekChange])

  const handleNextWeek = useCallback(() => {
    if (!week) return
    const next = dayjs(week + 'T12:00:00Z')
      .add(7, 'day')
      .format(WEEK_FORMAT)
    onWeekChange(next)
  }, [week, onWeekChange])

  const lastFridayStr = getLastCompletedFriday().format(WEEK_FORMAT)
  const nextWeekStr = week
    ? dayjs(week + 'T12:00:00Z')
        .add(7, 'day')
        .format(WEEK_FORMAT)
    : null
  const canGoNext = nextWeekStr !== null && nextWeekStr <= lastFridayStr

  const weekLabel = formatWeekLabel(week)
  const styles = useStyles()

  if (isPending) {
    return (
      <ScrollView>
        <View style={styles.headerWrapper}>
          <Paper
            p='l'
            backgroundColor='white'
            borderRadius='m'
            shadow='mid'
            border='default'
          >
            <Flex gap='m'>
              <Flex
                direction='row'
                alignItems='center'
                justifyContent='space-between'
                mb='xs'
              >
                <IconButton
                  icon={IconCaretLeft}
                  onPress={() => {}}
                  disabled
                  aria-label='Previous week'
                />
                <Flex direction='row' alignItems='center' gap='xs'>
                  <IconCalendarMonth color='subdued' />
                  <Text variant='title' size='l'>
                    {messages.header}: {weekLabel}
                  </Text>
                </Flex>
                <IconButton
                  icon={IconCaretRight}
                  onPress={() => {}}
                  disabled
                  aria-label='Next week'
                />
              </Flex>
              <Text variant='body' size='s' color='subdued' textAlign='center'>
                {messages.subtitle}
              </Text>
              <Flex direction='row' gap='s' justifyContent='center' mt='s'>
                <SelectablePill
                  type='radio'
                  size='large'
                  value='tracks'
                  label={messages.tracks}
                  isSelected={subFilter === 'tracks'}
                  onChange={(_, isSelected) =>
                    isSelected ? onSubFilterChange('tracks') : undefined
                  }
                />
                <SelectablePill
                  type='radio'
                  size='large'
                  value='underground'
                  label={messages.undergroundTracks}
                  isSelected={subFilter === 'underground'}
                  onChange={(_, isSelected) =>
                    isSelected ? onSubFilterChange('underground') : undefined
                  }
                />
              </Flex>
            </Flex>
          </Paper>
        </View>
        {Array(5)
          .fill(null)
          .map((_, i) => (
            <View key={i} style={styles.skeletonItem}>
              <LineupTileSkeleton noShimmer />
            </View>
          ))}
      </ScrollView>
    )
  }

  return (
    <TrackLineup
      isTrending
      rankIconCount={5}
      trackIds={trackIds}
      source={`DISCOVER_TRENDING_WINNERS_${subFilter}`}
      querySource={querySource}
      isPending={isPending}
      isFetching={false}
      hasNextPage={false}
      header={
        <View style={styles.headerWrapper}>
          <Paper
            p='l'
            backgroundColor='white'
            borderRadius='m'
            shadow='mid'
            border='default'
          >
            <Flex gap='m'>
              <Flex
                direction='row'
                alignItems='center'
                justifyContent='space-between'
                mb='xs'
              >
                <IconButton
                  icon={IconCaretLeft}
                  onPress={handlePrevWeek}
                  aria-label='Previous week'
                />
                <Flex direction='row' alignItems='center' gap='xs'>
                  <IconCalendarMonth color='subdued' />
                  <Text variant='title' size='l'>
                    {messages.header}: {weekLabel}
                  </Text>
                </Flex>
                <IconButton
                  icon={IconCaretRight}
                  onPress={handleNextWeek}
                  disabled={!canGoNext}
                  aria-label='Next week'
                />
              </Flex>
              <Text variant='body' size='s' color='subdued' textAlign='center'>
                {messages.subtitle}
              </Text>
              <Flex direction='row' gap='s' justifyContent='center' mt='s'>
                <SelectablePill
                  type='radio'
                  size='large'
                  value='tracks'
                  label={messages.tracks}
                  isSelected={subFilter === 'tracks'}
                  onChange={(_, isSelected) =>
                    isSelected ? onSubFilterChange('tracks') : undefined
                  }
                />
                <SelectablePill
                  type='radio'
                  size='large'
                  value='underground'
                  label={messages.undergroundTracks}
                  isSelected={subFilter === 'underground'}
                  onChange={(_, isSelected) =>
                    isSelected ? onSubFilterChange('underground') : undefined
                  }
                />
              </Flex>
            </Flex>
          </Paper>
        </View>
      }
    />
  )
}

const useStyles = makeStyles(({ spacing }) => ({
  headerWrapper: {
    paddingHorizontal: spacing(4),
    paddingTop: spacing(2),
    paddingBottom: 0
  },
  skeletonItem: {
    padding: spacing(4),
    paddingBottom: 0
  }
}))
