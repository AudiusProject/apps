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
  followers: 'FOLLOWERS',
  openLeaderboard: 'Open contest leaderboard'
}

const MAX_AVATARS = 7
const OVERLAP_PX = 14

type EventFollowersCardProps = {
  eventId: number
  followerCount: number
  onOpenLeaderboard?: () => void
}

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
      backgroundColor='white'
      shadow='flat'
      p='l'
      gap='m'
    >
      {/* Title line — "FOLLOWERS (245)" style uppercase label with a
          lighter count after it. */}
      <Flex gap='xs' alignItems='baseline'>
        <Text variant='label' size='m' color='subdued'>
          {messages.followers}
        </Text>
        <Text variant='label' size='m' color='subdued'>
          ({formatCount(followerCount)})
        </Text>
      </Flex>

      {followerCount > 0 ? (
        <Flex alignItems='center' justifyContent='space-between' gap='s'>
          <Flex>
            {hasAny
              ? visibleIds.map((userId, idx) => (
                  <Box
                    key={userId}
                    css={{
                      marginLeft: idx === 0 ? 0 : -OVERLAP_PX,
                      zIndex: idx
                    }}
                  >
                    <Avatar
                      userId={userId}
                      imageSize={SquareSizes.SIZE_150_BY_150}
                      size='medium'
                    />
                  </Box>
                ))
              : null}
          </Flex>
          <IconButton
            icon={IconCaretRight}
            color='default'
            aria-label={messages.openLeaderboard}
            onClick={onOpenLeaderboard}
          />
        </Flex>
      ) : null}
    </Paper>
  )
}
