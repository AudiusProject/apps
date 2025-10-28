import { useCallback } from 'react'

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
  const { data: coin } = useArtistCoin(mint)
  const ownerId = coin?.ownerId

  // Fetch exclusive tracks (token-gated) for the coin owner
  const { data: tracks, status } = useExclusiveTracks({
    userId: ownerId,
    gateConditions: ['token'],
    limit: MAX_PREVIEW_TRACKS,
    enabled: !!ownerId
  })

  const { data: totalCount = 0 } = useExclusiveTracksCount({
    userId: ownerId,
    gateConditions: ['token'],
    enabled: !!ownerId
  })

  const handleViewAll = useCallback(() => {
    if (coin?.ticker) {
      navigate(route.coinPage(coin.ticker) + '/exclusive-tracks')
    }
  }, [coin?.ticker, navigate])

  const shouldShowSection = totalCount > 0 && ownerId

  if (!shouldShowSection) return null

  const isLoading = status === 'pending'

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
        <PlainButton onClick={handleViewAll}>{messages.viewAll}</PlainButton>
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
              key={track.track_id}
              uid={`track-${track.track_id}`}
              id={track.track_id}
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
