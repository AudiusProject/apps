import React, { useMemo } from 'react'

import { useDiscoverWeekly } from '@audius/common/api'
import { useToggleTrack } from '@audius/common/hooks'
import { exploreMessages as messages } from '@audius/common/messages'
import { QueueSource } from '@audius/common/store'
import { Image } from 'react-native'

import { Divider, Flex, Paper, Text } from '@audius/harmony-native'
import discoverWeeklyArt from 'app/assets/images/discoverWeekly.jpg'
import { CollectionCardSkeleton } from 'app/components/collection-list/CollectionCardSkeleton'

import { useExploreSectionTracking } from '../hooks/useExploreSectionTracking'

const CARD_WIDTH = 200

/**
 * The mix rendered as a collection card, so it reads like a playlist even
 * though it isn't one. Mirrors the web Explore section.
 *
 * The artwork is a bundled asset rather than entity cover art: the mix has no
 * playlist_id to hang an image on. Same reason pressing plays in place rather
 * than navigating to a Collection screen -- there's nothing to navigate to.
 *
 * Deliberately not wrapped in ExploreSection like its siblings: there's one
 * card, and a section heading would just repeat the card's own title.
 */
export const DiscoverWeekly = () => {
  const { InViewWrapper, inView } = useExploreSectionTracking('Discover Weekly')
  const { trackIds, isLoading, isError, isSuccess } = useDiscoverWeekly(
    { limit: 30 },
    { enabled: inView }
  )

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

  if (isError || (isSuccess && trackIds.length === 0)) {
    return null
  }

  return (
    <InViewWrapper>
      <Flex w={CARD_WIDTH}>
        {!inView || isLoading || !trackIds.length ? (
          <CollectionCardSkeleton noShimmer />
        ) : (
          <Paper border='default' onPress={togglePlay}>
            <Flex p='s' gap='s'>
              <Image
                source={discoverWeeklyArt}
                style={{ width: '100%', aspectRatio: 1, borderRadius: 8 }}
              />
              <Text variant='title' textAlign='center' numberOfLines={1}>
                {messages.discoverWeekly}
              </Text>
              <Text
                variant='body'
                size='s'
                color='subdued'
                textAlign='center'
                numberOfLines={1}
              >
                {messages.discoverWeeklySubtitle}
              </Text>
            </Flex>
            <Divider orientation='horizontal' />
            <Flex
              direction='row'
              gap='l'
              pv='s'
              justifyContent='center'
              backgroundColor='surface1'
              borderBottomLeftRadius='m'
              borderBottomRightRadius='m'
            >
              <Text variant='body' size='s' strength='strong' color='subdued'>
                {messages.discoverWeeklyTrackCount(trackIds.length)}
              </Text>
            </Flex>
          </Paper>
        )}
      </Flex>
    </InViewWrapper>
  )
}
