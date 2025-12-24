import {
  useExclusiveTracks,
  useExclusiveTracksCount,
  useArtistCoin
} from '@audius/common/api'
import { exclusiveTracksPageLineupActions } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { Flex, PlainButton, Text } from '@audius/harmony'
import { useNavigate } from 'react-router'

import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import { LineupVariant } from 'components/lineup/types'
import { useIsMobile } from 'hooks/useIsMobile'

const messages = {
  exclusiveTracks: 'Exclusive Tracks',
  viewAll: 'View All'
}

const MAX_PREVIEW_TRACKS = 3

type ExclusiveTracksSectionProps = {
  mint: string
}

export const ExclusiveTracksSection = ({
  mint
}: ExclusiveTracksSectionProps) => {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { data: coin } = useArtistCoin(mint)
  const ownerId = coin?.ownerId

  // Fetch exclusive tracks (token-gated) for the coin owner
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
  } = useExclusiveTracks({
    userId: ownerId,
    pageSize: MAX_PREVIEW_TRACKS,
    initialPageSize: MAX_PREVIEW_TRACKS
  })

  const { data: totalCount = 0 } = useExclusiveTracksCount({
    userId: ownerId
  })

  const handleViewAll = () => {
    if (coin?.ticker) {
      if (isMobile) {
        navigate(`/coins/${coin.ticker}/exclusive-tracks/mobile`)
      } else {
        navigate(route.coinPage(coin.ticker) + '/exclusive-tracks')
      }
    }
  }

  const shouldShowSection = totalCount > 0 && ownerId

  if (!shouldShowSection) return null

  return (
    <Flex column gap='l' w='100%'>
      <Flex alignItems='center' justifyContent='space-between' w='100%'>
        <Flex alignItems='center' gap='s'>
          <Text variant='heading' size='s' color='default'>
            {messages.exclusiveTracks}
          </Text>
          <Text variant='heading' size='s' color='subdued'>
            ({totalCount})
          </Text>
        </Flex>
        <PlainButton size='large' onClick={handleViewAll}>
          {messages.viewAll}
        </PlainButton>
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
        pageSize={MAX_PREVIEW_TRACKS}
        initialPageSize={MAX_PREVIEW_TRACKS}
        variant={LineupVariant.SECTION}
        shouldLoadMore={false}
        maxEntries={MAX_PREVIEW_TRACKS}
      />
    </Flex>
  )
}
