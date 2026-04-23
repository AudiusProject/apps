import { useRemixesLineup } from '@audius/common/api'
import { remixMessages as messages } from '@audius/common/messages'
import { remixesPageLineupActions } from '@audius/common/store'
import { FilterButton, Flex, Text } from '@audius/harmony'

import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import type { RemixSortMethod } from 'pages/remixes-page/hooks'

type LineupSlice = ReturnType<typeof useRemixesLineup>

type ContestRemixesStyleSubmissionsProps = {
  lineup: LineupSlice
  pageSize: number
  winnerCount: number
  sortMethod: RemixSortMethod
  isCosign: boolean
  isContestEntry: boolean
  updateSortParam: (value: string) => void
  updateIsCosignParam: (value: string) => void
  updateIsContestEntryParam: (value: string) => void
  /** Mobile web uses title variant for section headers (RemixesPage mobile). */
  headingVariant?: 'heading' | 'title'
}

/**
 * Remix contest submissions body matching track-page RemixesPage: original
 * track + winners above the fold, then submissions with Co-Sign / Contest
 * entries / sort filters on the lower section.
 */
export const ContestRemixesStyleSubmissions = ({
  lineup,
  pageSize,
  winnerCount,
  sortMethod,
  isCosign,
  isContestEntry,
  updateSortParam,
  updateIsCosignParam,
  updateIsContestEntryParam,
  headingVariant = 'heading'
}: ContestRemixesStyleSubmissionsProps) => {
  const {
    data,
    count: lineupCount,
    isFetching,
    isPending,
    isError,
    hasNextPage,
    play,
    pause,
    loadNextPage,
    isPlaying,
    lineup: lineupState
  } = lineup

  const Heading = headingVariant

  const winnersDelineator = (
    <Flex justifyContent='space-between' mb='xl'>
      <Text variant={Heading}>{messages.winners}</Text>
    </Flex>
  )

  const remixesDelineator = (
    <Flex justifyContent='space-between' mb='xl' direction='column' gap='m'>
      <Text variant={Heading}>
        {messages.remixesTitle}
        {lineupCount !== undefined ? ` (${lineupCount})` : ''}
      </Text>
      <Flex gap='s' css={{ flexWrap: 'wrap' }}>
        <FilterButton
          label={messages.coSigned}
          value={isCosign ? 'true' : null}
          onClick={() => updateIsCosignParam(isCosign ? '' : 'true')}
        />
        <FilterButton
          label={messages.contestEntries}
          value={isContestEntry ? 'true' : null}
          onClick={() =>
            updateIsContestEntryParam(isContestEntry ? '' : 'true')
          }
        />
        <FilterButton
          value={sortMethod ?? 'recent'}
          variant='replaceLabel'
          onChange={updateSortParam}
          options={[
            { label: 'Most Recent', value: 'recent' },
            { label: 'Most Plays', value: 'plays' },
            { label: 'Most Favorites', value: 'likes' }
          ]}
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

  const maxEntries =
    lineupCount !== undefined && winnerCount
      ? lineupCount + winnerCount + 1
      : undefined

  return (
    <Flex direction='column' gap='l' w='100%'>
      <Text variant={Heading}>{messages.originalTrack}</Text>
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
        lineup={lineupState}
        pageSize={pageSize}
        actions={remixesPageLineupActions}
        delineatorMap={delineatorMap}
        maxEntries={maxEntries}
      />
    </Flex>
  )
}
