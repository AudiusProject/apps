import { useEffect, useCallback } from 'react'

import { useTrendingWinners } from '@audius/common/api'
import {
  trendingWinnersPageLineupActions,
  trendingWinnersPageLineupSelectors
} from '@audius/common/store'
import { dayjs } from '@audius/common/utils'
import {
  Flex,
  IconButton,
  IconCalendarMonth,
  IconCaretLeft,
  IconCaretRight,
  Paper,
  SelectablePill,
  Text
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import EndOfLineup from 'components/lineup/EndOfLineup'
import Lineup from 'components/lineup/Lineup'
import { useLineupProps } from 'components/lineup/hooks'
import { LineupVariant } from 'components/lineup/types'

const { getLineup } = trendingWinnersPageLineupSelectors

const messages = {
  header: 'Winners',
  subtitle: 'Artists trending Friday at 12PM PT win 1,000 $AUDIO',
  tracks: 'Tracks',
  undergroundTracks: 'Underground',
  lastFriday: 'Last Friday',
  endOfLineup: "Looks like you've reached the end of this list..."
}

type WinnersSubFilter = 'tracks' | 'underground'

const WEEK_FORMAT = 'YYYY-MM-DD'

/**
 * Most recent Friday that has passed (winners selected at 12PM PT on Fridays).
 * Used to cap "next" navigation so we never show upcoming weeks.
 */
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

const useTrendingWinnersLineup = (scrollParent: HTMLElement | undefined) => {
  return useLineupProps({
    actions: trendingWinnersPageLineupActions,
    getLineupSelector: getLineup,
    variant: LineupVariant.MAIN,
    scrollParent: scrollParent ?? undefined,
    isTrending: true,
    isOrdered: true
  })
}

export type WinnersViewProps = {
  week: string | null
  subFilter: WinnersSubFilter
  onWeekChange: (week: string | null) => void
  onSubFilterChange: (filter: 'tracks' | 'underground') => void
  containerRef?: React.RefObject<HTMLDivElement>
}

export const WinnersView = ({
  week,
  subFilter,
  onWeekChange,
  onSubFilterChange,
  containerRef
}: WinnersViewProps) => {
  const dispatch = useDispatch()
  const { data: tracks, isPending } = useTrendingWinners(
    {
      week,
      type: subFilter
    },
    { enabled: true }
  )

  const lineupProps = useTrendingWinnersLineup(
    containerRef?.current ?? undefined
  )

  useEffect(() => {
    if (tracks && tracks.length > 0) {
      dispatch(
        trendingWinnersPageLineupActions.fetchLineupMetadatas(
          0,
          tracks.length,
          true,
          { tracks }
        )
      )
    }
    return () => {
      dispatch(trendingWinnersPageLineupActions.reset())
    }
  }, [dispatch, tracks, subFilter])

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

  // Only allow "next" when the next week is on or before last completed Friday.
  // Use YYYY-MM-DD string comparison to avoid timezone/granularity edge cases.
  const lastFridayStr = getLastCompletedFriday().format(WEEK_FORMAT)
  const nextWeekStr = week
    ? dayjs(week + 'T12:00:00Z')
        .add(7, 'day')
        .format(WEEK_FORMAT)
    : null
  const canGoNext = nextWeekStr !== null && nextWeekStr <= lastFridayStr

  const weekLabel = formatWeekLabel(week)

  return (
    <Flex column w='100%' p='m'>
      <Paper
        column
        backgroundColor='white'
        borderRadius='m'
        shadow='mid'
        p='l'
        mb='l'
      >
        <Flex column alignItems='center' gap='s'>
          <Flex alignItems='center' justifyContent='space-between' w='100%'>
            <IconButton
              aria-label='Previous week'
              icon={IconCaretLeft}
              onClick={handlePrevWeek}
            />
            <Flex flex={1} justifyContent='center' alignItems='center' gap='xs'>
              <IconCalendarMonth color='subdued' />
              <Text variant='title' size='l'>
                {messages.header}: {weekLabel}
              </Text>
            </Flex>
            <IconButton
              aria-label='Next week'
              icon={IconCaretRight}
              onClick={handleNextWeek}
              disabled={!canGoNext}
            />
          </Flex>
          <Text variant='body' size='s' color='subdued' textAlign='center'>
            {messages.subtitle}
          </Text>
        </Flex>
        <Flex gap='s' justifyContent='center' role='tablist' mt='s'>
          <SelectablePill
            type='button'
            label={messages.tracks}
            size='large'
            isSelected={subFilter === 'tracks'}
            onClick={() => onSubFilterChange('tracks')}
          />
          <SelectablePill
            type='button'
            label={messages.undergroundTracks}
            size='large'
            isSelected={subFilter === 'underground'}
            onClick={() => onSubFilterChange('underground')}
          />
        </Flex>
      </Paper>

      {isPending ? (
        <Flex column gap='m'>
          {[1, 2, 3, 4, 5].map((i) => (
            <Flex key={i} h={128} alignItems='center' gap='l' p='s' />
          ))}
        </Flex>
      ) : (
        <div>
          <Lineup
            aria-label='trending winners tracks'
            {...lineupProps}
            endOfLineup={<EndOfLineup description={messages.endOfLineup} />}
            variant={LineupVariant.MAIN}
          />
        </div>
      )}
    </Flex>
  )
}
