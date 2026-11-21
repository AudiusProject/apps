import { useCallback, useMemo, useState } from 'react'

import {
  getRemixesQueryKey,
  useRemixContest,
  useRemixesCount,
  useRemixesLineup
} from '@audius/common/api'
import type { ID } from '@audius/common/models'

import { Divider, FilterButton, Flex, Text } from '@audius/harmony-native'
import { TrackLineup } from 'app/components/lineup/TrackLineup'

import { useContestPage } from '../ContestPageContext'

const CONTEST_PAGE_SIZE = 10

const messages = {
  submissions: 'SUBMISSIONS',
  winners: 'WINNERS',
  coSigned: 'Co-Signed',
  sort: 'Sort'
}

const SORT_OPTIONS = [
  { label: 'Most Recent', value: 'recent' as const },
  { label: 'Most Plays', value: 'plays' as const },
  { label: 'Most Favorites', value: 'likes' as const }
]

export const ContestSubmissionsTab = () => {
  const { trackId } = useContestPage()
  const { data: contest } = useRemixContest(trackId)
  const winnerCount = contest?.eventData?.winners?.length ?? 0

  const [sortMethod, setSortMethod] = useState<'recent' | 'plays' | 'likes'>(
    'recent'
  )
  const [isCosign, setIsCosign] = useState(false)

  const handleSortChange = useCallback((value: string | undefined) => {
    setSortMethod((value as 'recent' | 'plays' | 'likes') ?? 'recent')
  }, [])

  const remixesLineupArgs = useMemo(
    () => ({
      trackId,
      includeOriginal: true,
      includeWinners: true,
      isContestEntry: true,
      pageSize: CONTEST_PAGE_SIZE,
      sortMethod,
      isCosign
    }),
    [trackId, sortMethod, isCosign]
  )
  const lineup = useRemixesLineup(remixesLineupArgs)
  const lineupTrackIds = useMemo(
    () => (lineup.data ?? []).map((d) => d.id as ID),
    [lineup.data]
  )

  const submissionsQuerySource = useMemo(
    () => ({
      queryKey: [...getRemixesQueryKey(remixesLineupArgs)] as unknown[]
    }),
    [remixesLineupArgs]
  )

  const { data: submissionsCount = 0 } = useRemixesCount(
    { trackId, isContestEntry: true },
    { enabled: !!trackId, staleTime: 60_000 }
  )

  const winnersDelineator = useMemo(
    () => (
      <Flex ph='l' pt='l' gap='xs'>
        <Divider />
        <Text variant='label' size='m' color='subdued'>
          {messages.winners}
        </Text>
      </Flex>
    ),
    []
  )

  const submissionsDelineator = useMemo(
    () => (
      <Flex ph='l' pt='l' gap='m'>
        <Divider />
        <Flex row justifyContent='space-between' alignItems='center' gap='s'>
          <Text variant='label' size='m' color='subdued'>
            {submissionsCount > 0
              ? `${submissionsCount} ${messages.submissions}`
              : messages.submissions}
          </Text>
        </Flex>
        <Flex row gap='s' wrap='wrap'>
          <FilterButton
            label={messages.coSigned}
            value={isCosign ? 'true' : undefined}
            onPress={() => setIsCosign((prev) => !prev)}
            onChange={(v) => setIsCosign(v === 'true')}
            size='small'
          />
          <FilterButton
            label={messages.sort}
            value={sortMethod}
            variant='replaceLabel'
            onChange={handleSortChange}
            options={SORT_OPTIONS}
            disableSearch
            size='small'
          />
        </Flex>
      </Flex>
    ),
    [submissionsCount, isCosign, sortMethod, handleSortChange]
  )

  const delineatorMap = useMemo(
    () =>
      winnerCount > 0
        ? {
            0: winnersDelineator,
            [winnerCount]: submissionsDelineator
          }
        : {
            0: submissionsDelineator
          },
    [winnerCount, winnersDelineator, submissionsDelineator]
  )

  return (
    <TrackLineup
      trackIds={lineupTrackIds}
      source='CONTEST_SUBMISSIONS'
      querySource={submissionsQuerySource}
      isPending={lineup.isPending}
      isFetching={lineup.isFetching}
      loadNextPage={lineup.loadNextPage}
      pageSize={CONTEST_PAGE_SIZE}
      hasNextPage={!!lineup.hasNextPage}
      delineatorMap={delineatorMap}
    />
  )
}
