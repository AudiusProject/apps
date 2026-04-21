import { useEventFollowers } from '@audius/common/api'
import { SquareSizes } from '@audius/common/models'
import { formatCount } from '@audius/common/utils'
import {
  Box,
  Flex,
  IconButton,
  IconCaretRight,
  Paper,
  Text
} from '@audius/harmony'

import { Avatar } from 'components/avatar/Avatar'

const messages = {
  followers: 'Followers',
  openLeaderboard: 'Open contest leaderboard'
}

// Number of avatar discs we'll surface before the chevron. Kept small
// because each extra disc visibly compresses the stack.
const MAX_AVATARS = 8
// Horizontal overlap between adjacent avatars. Match the design's ~1/3
// overlap for the leaderboard row.
const OVERLAP_PX = 12

type EventFollowersCardProps = {
  eventId: number
  followerCount: number
  onOpenLeaderboard?: () => void
}

/**
 * Right-column "Followers (N)" card for the contest page. Renders a capped
 * stack of follower avatars (ordered by the follower's own follower count
 * on the backend) and a chevron that opens the leaderboard modal.
 *
 * Uses the ad-hoc `/v1/events/:eventId/followers` endpoint we added to the
 * Go api — not in the generated SDK yet, so the hook fetches directly.
 */
export const EventFollowersCard = ({
  eventId,
  followerCount,
  onOpenLeaderboard
}: EventFollowersCardProps) => {
  const { userIds } = useEventFollowers({ eventId, limit: MAX_AVATARS })

  const visibleIds = (userIds ?? []).slice(0, MAX_AVATARS)
  const hasAny = visibleIds.length > 0

  return (
    <Paper
      direction='column'
      borderRadius='m'
      border='default'
      css={{ backgroundColor: 'var(--harmony-white)' }}
    >
      <Flex p='l' gap='m' alignItems='center' justifyContent='space-between'>
        <Flex gap='xs' alignItems='baseline'>
          <Text variant='heading' size='s'>
            {messages.followers}
          </Text>
          <Text variant='heading' size='s' color='subdued'>
            ({formatCount(followerCount)})
          </Text>
        </Flex>
        {hasAny ? (
          <IconButton
            icon={IconCaretRight}
            color='default'
            aria-label={messages.openLeaderboard}
            onClick={onOpenLeaderboard}
          />
        ) : null}
      </Flex>

      {hasAny ? (
        <Box pb='l' ph='l'>
          <Flex>
            {visibleIds.map((userId, idx) => (
              <Box
                key={userId}
                css={{
                  // Overlap each subsequent avatar over the previous to
                  // produce the stacked "face pile" look.
                  marginLeft: idx === 0 ? 0 : -OVERLAP_PX,
                  // Later avatars sit on top so the overlap reads left → right.
                  zIndex: idx
                }}
              >
                <Avatar
                  userId={userId}
                  imageSize={SquareSizes.SIZE_150_BY_150}
                  size='medium'
                />
              </Box>
            ))}
          </Flex>
        </Box>
      ) : null}
    </Paper>
  )
}
