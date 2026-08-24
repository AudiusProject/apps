import { useMemo } from 'react'

import { useToggleTrack } from '@audius/common/hooks'
import { exploreMessages as messages } from '@audius/common/messages'
import { ID } from '@audius/common/models'
import { QueueSource } from '@audius/common/store'
import { Artwork, Flex, Text } from '@audius/harmony'

import discoverWeeklyArt from 'assets/img/discoverWeekly.jpg'
import { Card, CardContent, CardFooter } from 'components/card'
import { useIsMobile } from 'hooks/useIsMobile'

type DiscoverWeeklyCardProps = {
  trackIds: ID[]
}

/**
 * Renders the Discover Weekly mix as a collection card, so it reads like a
 * playlist even though it isn't one.
 *
 * The artwork is a checked-in asset rather than an entity's cover art:
 * Discover Weekly has no playlist_id to hang an image on, since Audius
 * playlists are on-chain entities and the mix is computed per request. Same
 * reason there's no permalink — clicking plays the mix in place instead of
 * navigating, which is the closest we can get to playlist behavior without a
 * route.
 */
export const DiscoverWeeklyCard = ({ trackIds }: DiscoverWeeklyCardProps) => {
  const isMobile = useIsMobile()

  // Queue the whole mix, starting at the top, so playback continues through
  // all 30 rather than stopping after the first track.
  const entries = useMemo(
    () => trackIds.map((id) => ({ id, source: QueueSource.EXPLORE })),
    [trackIds]
  )

  const { togglePlay } = useToggleTrack({
    id: trackIds[0] ?? null,
    source: QueueSource.EXPLORE,
    entries
  })

  return (
    <Card size={isMobile ? 'xs' : 's'} onClick={togglePlay}>
      <Flex direction='column' p='s' gap='s'>
        <Artwork src={discoverWeeklyArt} />
        <CardContent gap='xs' css={{ minWidth: 0 }}>
          <Text variant='title' textAlign='center' ellipses>
            {messages.discoverWeekly}
          </Text>
          <Text variant='body' size='s' color='subdued' textAlign='center'>
            {messages.discoverWeeklySubtitle}
          </Text>
        </CardContent>
      </Flex>
      <CardFooter>
        <Text variant='body' size='s' strength='strong' color='subdued'>
          {messages.discoverWeeklyTrackCount(trackIds.length)}
        </Text>
      </CardFooter>
    </Card>
  )
}
