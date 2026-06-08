import { useCallback, useMemo, useState } from 'react'

import {
  getRemixesQueryKey,
  useCurrentUserId,
  useRemixContest,
  useRemixesCount,
  useRemixesLineup,
  useTrackByParams
} from '@audius/common/api'
import { remixMessages as messages } from '@audius/common/messages'
import { pluralize, dayjs } from '@audius/common/utils'

import {
  Button,
  FilterButton,
  Flex,
  IconRemix,
  IconTrophy,
  Text
} from '@audius/harmony-native'
import { Screen, ScreenContent, ScreenHeader } from 'app/components/core'
import { TrackLineup } from 'app/components/lineup/TrackLineup'
import { useDrawer } from 'app/hooks/useDrawer'
import { useRoute } from 'app/hooks/useRoute'

const SORT_OPTIONS = [
  { label: 'Most Recent', value: 'recent' as const },
  { label: 'Most Plays', value: 'plays' as const },
  { label: 'Most Favorites', value: 'likes' as const }
]

const REMIXES_PAGE_SIZE = 10

export const TrackRemixesScreen = () => {
  const { onOpen: openPickWinnersDrawer } = useDrawer('PickWinners')
  const { data: currentUserId } = useCurrentUserId()
  const { params } = useRoute<'TrackRemixes'>()
  const { data: track } = useTrackByParams(params)
  const trackId = track?.track_id

  const [sortMethod, setSortMethod] = useState<'recent' | 'plays' | 'likes'>(
    'recent'
  )
  const [isCosign, setIsCosign] = useState(false)
  const [isContestEntry, setIsContestEntry] = useState(false)

  const handleSortChange = useCallback((value: string | undefined) => {
    setSortMethod((value as 'recent' | 'plays' | 'likes') ?? 'recent')
  }, [])

  const {
    count,
    isFetching,
    isPending,
    hasNextPage,
    loadNextPage,
    pageSize,
    trackIds
  } = useRemixesLineup({
    trackId: track?.track_id,
    includeOriginal: true,
    includeWinners: true,
    sortMethod,
    isCosign,
    isContestEntry
  })

  const querySource = useMemo(
    () => ({
      queryKey: [
        ...getRemixesQueryKey({
          trackId: track?.track_id,
          includeOriginal: true,
          includeWinners: true,
          pageSize: REMIXES_PAGE_SIZE,
          sortMethod,
          isCosign,
          isContestEntry
        })
      ] as unknown[]
    }),
    [track?.track_id, sortMethod, isCosign, isContestEntry]
  )

  const { data: contest } = useRemixContest(trackId)
  const isRemixContest = !!contest
  const isRemixContestEnded =
    isRemixContest && dayjs(contest.endDate).isBefore(dayjs())
  const isTrackOwner = currentUserId === track?.owner_id
  const { data: remixCount = 0 } = useRemixesCount({
    trackId: track?.track_id,
    isContestEntry: true
  })
  const showPickWinnersButton =
    isTrackOwner && isRemixContestEnded && remixCount > 0
  const winnerCount = contest?.eventData?.winners?.length ?? 0

  const remixesText = pluralize('Remix', count, 'es', !count)
  const remixesCountText = `${count ?? ''} ${remixesText}`

  const winnersDelineator = (
    <Flex ph='l' pt='xl'>
      <Text variant='title'>{messages.winners}</Text>
    </Flex>
  )

  const remixesDelineator = (
    <Flex ph='l' pt='xl' gap='m'>
      <Flex row alignItems='center' justifyContent='space-between'>
        <Text variant='title'>
          {isRemixContest ? messages.submissionsTitle : messages.remixesTitle}
          {count !== undefined ? ` (${count})` : ''}
        </Text>
        {showPickWinnersButton ? (
          <Button size='xs' onPress={openPickWinnersDrawer}>
            {winnerCount > 0 ? messages.editWinners : messages.pickWinners}
          </Button>
        ) : null}
      </Flex>
      <Flex row gap='s' wrap='wrap'>
        <FilterButton
          label={messages.coSigned}
          value={isCosign ? 'true' : undefined}
          onPress={() => setIsCosign((prev) => !prev)}
          onChange={(v) => setIsCosign(v === 'true')}
          size='small'
        />
        {isRemixContest ? (
          <FilterButton
            label={messages.contestEntries}
            value={isContestEntry ? 'true' : undefined}
            onPress={() => setIsContestEntry((prev) => !prev)}
            onChange={(v) => setIsContestEntry(v === 'true')}
            size='small'
          />
        ) : null}
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

  const headerSubtitle = (
    <Flex ph='l' pt='l' alignItems='center'>
      <Text variant='body' color='subdued'>
        {remixesCountText}
      </Text>
    </Flex>
  )

  return (
    <Screen>
      <ScreenHeader
        text={
          isRemixContest ? messages.submissionsTitle : messages.remixesTitle
        }
        icon={isRemixContest ? IconTrophy : IconRemix}
      />
      <ScreenContent>
        <TrackLineup
          trackIds={trackIds}
          source='REMIXES_PAGE_TRACKS'
          querySource={querySource}
          isFetching={isFetching}
          isPending={isPending}
          hasNextPage={hasNextPage}
          loadNextPage={loadNextPage}
          pageSize={pageSize}
          header={isRemixContest ? null : headerSubtitle}
          delineatorMap={delineatorMap}
        />
      </ScreenContent>
    </Screen>
  )
}
