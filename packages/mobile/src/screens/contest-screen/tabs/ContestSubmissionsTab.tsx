import { useCallback, useMemo, useState } from 'react'

import {
  useCurrentUserId,
  useRemixContest,
  useRemixes,
  useRemixesLineup
} from '@audius/common/api'
import { remixMessages as messages } from '@audius/common/messages'
import { remixesPageLineupActions } from '@audius/common/store'
import { dayjs } from '@audius/common/utils'

import { Button, FilterButton, Flex, Text } from '@audius/harmony-native'
import { TanQueryLineup } from 'app/components/lineup/TanQueryLineup'
import { useDrawer } from 'app/hooks/useDrawer'

import { useContestPage } from '../ContestPageContext'

const SORT_OPTIONS = [
  { label: 'Most Recent', value: 'recent' as const },
  { label: 'Most Plays', value: 'plays' as const },
  { label: 'Most Favorites', value: 'likes' as const }
]

/**
 * Submissions tab — same remix lineup behavior as `TrackRemixesScreen` for
 * contests: original track + winners + filters, backed by `TanQueryLineup` /
 * `CollapsibleSectionList` so the contest header collapses on scroll.
 *
 * Do not call `loadCachedDataIntoLineup` in an effect here: that callback is
 * recreated whenever Redux lineup state changes (`useLineupQuery` depends on
 * `lineup` in its `useCallback` deps), which would retrigger the effect and
 * repeatedly `reset()` the lineup — breaking the list on native.
 */
export const ContestSubmissionsTab = () => {
  const { onOpen: openPickWinnersDrawer } = useDrawer('PickWinners')
  const { trackId, eventOwnerUserId } = useContestPage()
  const { data: currentUserId } = useCurrentUserId()

  const [sortMethod, setSortMethod] = useState<'recent' | 'plays' | 'likes'>(
    'recent'
  )
  const [isCosign, setIsCosign] = useState(false)
  const [isContestEntry, setIsContestEntry] = useState(true)

  const handleSortChange = useCallback((value: string | undefined) => {
    setSortMethod((value as 'recent' | 'plays' | 'likes') ?? 'recent')
  }, [])

  const { data, count, isFetching, isPending, loadNextPage, lineup, pageSize } =
    useRemixesLineup({
      trackId,
      includeOriginal: true,
      includeWinners: true,
      sortMethod,
      isCosign,
      isContestEntry
    })

  const { data: contest } = useRemixContest(trackId)
  const winnerCount = contest?.eventData?.winners?.length ?? 0
  const isContestEnded =
    !!contest?.endDate && dayjs(contest.endDate).isBefore(dayjs())
  const isTrackOwner = !!currentUserId && currentUserId === eventOwnerUserId
  const { data: remixes } = useRemixes({
    trackId,
    isContestEntry: true
  })
  const remixCount = remixes?.pages[0]?.count ?? 0
  const showPickWinnersButton = isTrackOwner && isContestEnded && remixCount > 0

  const winnersDelineator = (
    <Flex ph='l' pt='xl'>
      <Text variant='title'>{messages.winners}</Text>
    </Flex>
  )

  const remixesDelineator = (
    <Flex ph='l' pt='xl' gap='m'>
      {count ? (
        <Text variant='title'>
          {messages.remixesTitle}
          {count !== undefined ? ` (${count})` : ''}
        </Text>
      ) : null}
      <Flex row gap='s' wrap='wrap'>
        <FilterButton
          label={messages.coSigned}
          value={isCosign ? 'true' : undefined}
          onPress={() => setIsCosign((prev) => !prev)}
          onChange={(v) => setIsCosign(v === 'true')}
          size='small'
        />
        <FilterButton
          label={messages.contestEntries}
          value={isContestEntry ? 'true' : undefined}
          onPress={() => setIsContestEntry((prev) => !prev)}
          onChange={(v) => setIsContestEntry(v === 'true')}
          size='small'
        />
        <FilterButton
          label='Sort'
          value={sortMethod}
          variant='replaceLabel'
          onChange={handleSortChange}
          options={SORT_OPTIONS}
          disableSearch
          size='small'
        />
      </Flex>
    </Flex>
  )

  const delineatorMap =
    winnerCount > 0
      ? {
          0: winnersDelineator,
          [winnerCount]: remixesDelineator
        }
      : {
          0: remixesDelineator
        }

  const maxEntries = count && winnerCount ? count + winnerCount + 1 : undefined

  const header = useMemo(
    () => (
      <Flex
        row
        ph='l'
        pt='l'
        alignItems='center'
        justifyContent='space-between'
      >
        <Text variant='title'>{messages.originalTrack}</Text>
        {showPickWinnersButton ? (
          <Button size='xs' onPress={openPickWinnersDrawer}>
            {winnerCount > 0 ? messages.editWinners : messages.pickWinners}
          </Button>
        ) : null}
      </Flex>
    ),
    [openPickWinnersDrawer, showPickWinnersButton, winnerCount]
  )

  return (
    <TanQueryLineup
      header={header}
      queryData={data}
      isFetching={isFetching}
      isPending={isPending}
      loadNextPage={loadNextPage}
      lineup={lineup}
      actions={remixesPageLineupActions}
      pageSize={pageSize}
      hasMore={false}
      delineatorMap={delineatorMap}
      maxEntries={maxEntries}
    />
  )
}
