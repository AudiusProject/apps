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

// Max avatar discs surfaced before the chevron. Kept small because
// each extra disc visibly compresses the stack. The Figma reference
// (node 2857-99349) shows seven overlapping discs.
const MAX_AVATARS = 7
// Horizontal overlap between adjacent avatars. Match the Figma's
// ~1/3 overlap for the leaderboard row.
const OVERLAP_PX = 14

type EventFollowersCardProps = {
  eventId: number
  followerCount: number
  onOpenLeaderboard?: () => void
}

/**
 * Right-column Followers card for the contest page, aligned to
 * Figma node 2857-99349.
 *
 * Layout:
 *   FOLLOWERS (245)                    ← label + count, small uppercase
 *   [◉◉◉◉◉◉◉]                      ›  ← avatar stack + chevron, one row
 *
 * Title lives inside the Paper (matches the other right-column
 * tiles — STEMS & DOWNLOADS, COMMENTS). The avatar stack and chevron
 * share a single row with `justify-content: space-between` so the
 * chevron hugs the right edge. Empty-state just hides the avatar row
 * (title stays).
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
                      // Overlap each subsequent avatar over the previous
                      // to produce the stacked "face pile" look.
                      marginLeft: idx === 0 ? 0 : -OVERLAP_PX,
                      // Later avatars sit on top so the overlap reads
                      // left → right.
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
