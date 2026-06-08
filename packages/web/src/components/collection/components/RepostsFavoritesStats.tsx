import { useCallback, MouseEvent } from 'react'

import { formatCount, pluralize } from '@audius/common/utils'
import {
  Flex,
  IconHeart as IconFavorite,
  IconRepost,
  PlainButton
} from '@audius/harmony'

import { useIsMobile } from 'hooks/useIsMobile'

type RepostsFavoritesStatsProps = {
  repostCount: number
  saveCount: number
  onClickReposts?: () => void
  onClickFavorites?: () => void
  className?: string
  forceMobileStyle?: boolean
}

const messages = {
  reposts: 'Repost',
  favorites: 'Favorite'
}

// NOTE: this is a newer version of the other RepostsFavoritesStats component;
// unclear if designers want to deprecate the old one just yet so this is a standalone component for CollectionHeader
export const RepostsFavoritesStats = ({
  repostCount,
  saveCount,
  onClickReposts,
  onClickFavorites,
  forceMobileStyle = false
}: RepostsFavoritesStatsProps) => {
  const isMobile = useIsMobile()
  const shouldUseMobileStyle = isMobile || forceMobileStyle
  const handleOnClickReposts = useCallback(
    (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onClickReposts?.()
    },
    [onClickReposts]
  )
  const handleOnClickFavorites = useCallback(
    (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onClickFavorites?.()
    },
    [onClickFavorites]
  )

  return !!repostCount || !!saveCount ? (
    <Flex alignItems='center' gap={shouldUseMobileStyle ? 'xl' : 'l'}>
      {!!repostCount && (
        <PlainButton
          size={shouldUseMobileStyle ? 'default' : 'large'}
          variant={shouldUseMobileStyle ? 'default' : 'subdued'}
          iconLeft={IconRepost}
          onClick={handleOnClickReposts}
          css={{ padding: 0 }}
        >
          {`${formatCount(repostCount)} ${pluralize(
            messages.reposts,
            repostCount
          )}`}
        </PlainButton>
      )}
      {!!saveCount && (
        <PlainButton
          size={shouldUseMobileStyle ? 'default' : 'large'}
          variant={shouldUseMobileStyle ? 'default' : 'subdued'}
          iconLeft={IconFavorite}
          onClick={handleOnClickFavorites}
          css={{ padding: 0 }}
        >
          {`${formatCount(saveCount)} ${pluralize(
            messages.favorites,
            saveCount
          )}`}
        </PlainButton>
      )}
    </Flex>
  ) : null
}
