import { useSupporter } from '@audius/common/api'
import { useCurrentCommentSection } from '@audius/common/context'
import { useIsCoinMember } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import {
  Flex,
  IconArtistCoin,
  IconComponent,
  IconStar,
  IconTipping,
  IconTrophy,
  Text
} from '@audius/harmony'

type BadgeType = 'artist' | 'topSupporter' | 'tipSupporter' | 'coinMember'

const iconMap: Record<BadgeType, IconComponent> = {
  artist: IconStar,
  topSupporter: IconTrophy,
  tipSupporter: IconTipping,
  coinMember: IconArtistCoin
}
const messages: Record<BadgeType, string> = {
  artist: 'Artist',
  topSupporter: 'Top Supporter',
  tipSupporter: 'Tip Supporter',
  coinMember: 'Coin Member'
}

type CommentBadgeProps = {
  isArtist: boolean
  commentUserId: ID
}

export const CommentBadge = ({
  commentUserId,
  isArtist
}: CommentBadgeProps) => {
  const { artistId } = useCurrentCommentSection()
  const { data: supporter } = useSupporter(
    {
      userId: artistId,
      supporterUserId: commentUserId
    },
    // Read only, relying on prefetch in commentsContext
    { enabled: false }
  )
  const { isCoinHolder } = useIsCoinMember(commentUserId, artistId)

  const isTopSupporter = supporter?.rank === 1

  const badgeType = isArtist
    ? 'artist'
    : isCoinHolder
      ? 'coinMember'
      : isTopSupporter
        ? 'topSupporter'
        : supporter
          ? 'tipSupporter'
          : null

  if (badgeType === null) return null

  const Icon = iconMap[badgeType]

  return (
    <Flex gap='xs' alignItems='center'>
      <Icon color='accent' size='2xs' />
      <Text color='accent' variant='body' size='s'>
        {messages[badgeType]}
      </Text>
    </Flex>
  )
}
