import { useCurrentCommentSection } from '@audius/common/context'
import { useIsCoinMember } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import {
  Flex,
  IconArtistCoin,
  IconComponent,
  IconStar,
  Text
} from '@audius/harmony'

type BadgeType = 'artist' | 'coinMember'

const iconMap: Record<BadgeType, IconComponent> = {
  artist: IconStar,
  coinMember: IconArtistCoin
}
const messages: Record<BadgeType, string> = {
  artist: 'Artist',
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
  const { isCoinHolder } = useIsCoinMember(commentUserId, artistId)

  const badgeType = isArtist ? 'artist' : isCoinHolder ? 'coinMember' : null

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
