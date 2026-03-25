import {
  useExclusiveTracks,
  useExclusiveTracksCount,
  useArtistCoin
} from '@audius/common/api'
import { exclusiveTracksPageLineupActions } from '@audius/common/store'
import { Flex, Text } from '@audius/harmony'

import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import { LineupVariant } from 'components/lineup/types'

const messages = {
  fanClubFeed: 'Fan Club Feed'
}

const FEED_PAGE_SIZE = 10

type ExclusiveTracksSectionProps = {
  mint: string
}

export const ExclusiveTracksSection = ({
  mint
}: ExclusiveTracksSectionProps) => {
  const { data: coin } = useArtistCoin(mint)
  const ownerId = coin?.ownerId

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
    lineup,
    pageSize
  } = useExclusiveTracks({
    userId: ownerId,
    pageSize: FEED_PAGE_SIZE,
    initialPageSize: FEED_PAGE_SIZE
  })

  const { data: totalCount = 0 } = useExclusiveTracksCount({
    userId: ownerId
  })

  const shouldShowSection = totalCount > 0 && ownerId

  if (!shouldShowSection) return null

  return (
    <Flex column gap='l' w='100%'>
      <Flex alignItems='center' gap='s' w='100%'>
        <Text variant='heading' size='m' color='default'>
          {messages.fanClubFeed}
        </Text>
        <Text variant='heading' size='m' color='subdued'>
          ({totalCount})
        </Text>
      </Flex>

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
        actions={exclusiveTracksPageLineupActions}
        pageSize={pageSize}
        initialPageSize={FEED_PAGE_SIZE}
        variant={LineupVariant.SECTION}
        shouldLoadMore
      />
    </Flex>
  )
}
