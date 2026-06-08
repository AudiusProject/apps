import { useCallback } from 'react'

import { useEventFollowers } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { formatCount } from '@audius/common/utils'
import { Pressable, View } from 'react-native'

import {
  Flex,
  IconButton,
  IconCaretRight,
  Paper,
  Text
} from '@audius/harmony-native'
import { ProfilePicture } from 'app/components/core/ProfilePicture'
import { useNavigation } from 'app/hooks/useNavigation'

/**
 * Followers tile. Matches Figma 2888-128953: "FOLLOWERS (N)" label
 * + a stacked row of overlapping avatars + a chevron-right button
 * that opens the leaderboard. Empty follower state hides the avatar
 * row but keeps the title.
 *
 * Extracted from `ContestScreen.tsx` so the Details tab body (which
 * lives in its own file under `tabs/`) can import it without
 * re-introducing a circular dependency back to the screen shell.
 *
 * The whole card is now pressable — tapping anywhere on the card
 * (card surface or chevron) navigates to the dedicated
 * `ContestFollowers` screen. A single `onPress` on the wrapping
 * `Pressable` keeps the target easy to hit, while the inner chevron
 * `IconButton` preserves the affordance called out in Figma without
 * needing its own handler.
 */

// Max avatar discs surfaced before the chevron — matches the web
// reference and keeps the stack visually readable. Extra discs just
// compress the row.
const FOLLOWERS_MAX_AVATARS = 7
// Horizontal overlap between adjacent avatars. ~1/3 of the 40px
// avatar diameter, same ratio as the web leaderboard row.
const FOLLOWERS_OVERLAP_PX = 14

type EventFollowersCardProps = {
  eventId: ID
  followerCount: number
}

export const EventFollowersCard = ({
  eventId,
  followerCount
}: EventFollowersCardProps) => {
  const navigation = useNavigation()
  const { userIds } = useEventFollowers({
    eventId,
    limit: FOLLOWERS_MAX_AVATARS
  })
  const visibleIds = (userIds ?? []).slice(0, FOLLOWERS_MAX_AVATARS)
  const hasAny = visibleIds.length > 0

  const handleOpen = useCallback(() => {
    navigation.push('ContestFollowers', { eventId })
  }, [navigation, eventId])

  return (
    <Pressable onPress={handleOpen} disabled={!hasAny}>
      <Paper direction='column' p='l' gap='m' borderRadius='m' shadow='flat'>
        <Flex direction='row' alignItems='baseline' gap='xs'>
          <Text variant='label' size='m' color='subdued'>
            FOLLOWERS
          </Text>
          <Text variant='label' size='m' color='subdued'>
            ({formatCount(followerCount)})
          </Text>
        </Flex>
        {hasAny ? (
          <Flex
            direction='row'
            alignItems='center'
            justifyContent='space-between'
            gap='s'
          >
            <View style={{ flexDirection: 'row' }}>
              {visibleIds.map((userId, idx) => (
                <View
                  key={userId}
                  style={{
                    marginLeft: idx === 0 ? 0 : -FOLLOWERS_OVERLAP_PX,
                    zIndex: idx
                  }}
                >
                  <ProfilePicture
                    userId={userId}
                    style={{ width: 40, height: 40 }}
                  />
                </View>
              ))}
            </View>
            <IconButton
              icon={IconCaretRight}
              color='default'
              aria-label='Open contest leaderboard'
              onPress={handleOpen}
            />
          </Flex>
        ) : null}
      </Paper>
    </Pressable>
  )
}
