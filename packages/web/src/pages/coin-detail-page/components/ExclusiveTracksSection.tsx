import {
  useExclusiveTracks,
  useExclusiveTracksCount,
  useArtistCoin
} from '@audius/common/api'
import { route } from '@audius/common/utils'
import { Flex, PlainButton, Skeleton, Text } from '@audius/harmony'
import { useNavigate } from 'react-router-dom-v5-compat'

import { TrackTile } from 'components/track/desktop/TrackTile'
import { TrackTileSize } from 'components/track/types'
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
  const { data: tracks, lineup } = useExclusiveTracks({
    userId: ownerId,
    pageSize: MAX_PREVIEW_TRACKS
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

  const isLoading = lineup.isMetadataLoading

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

      {isLoading ? (
        <Flex column gap='m'>
          {Array.from({ length: MAX_PREVIEW_TRACKS }).map((_, index) => (
            <Skeleton key={index} h={128} borderRadius='m' />
          ))}
        </Flex>
      ) : (
        <Flex column gap='s' w='100%'>
          {tracks?.map((track, index) => (
            <TrackTile
              key={track.id}
              uid={`track-${track.id}`}
              id={track.id}
              index={index}
              size={TrackTileSize.SMALL}
              statSize='small'
              ordered={false}
              togglePlay={() => {}}
              isLoading={false}
              hasLoaded={() => {}}
              isTrending={false}
              isFeed={false}
            />
          ))}
        </Flex>
      )}
    </Flex>
  )
}
