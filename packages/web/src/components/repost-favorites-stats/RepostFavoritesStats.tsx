import { useCallback, MouseEvent } from 'react'

import { formatCount, pluralize } from '@audius/common/utils'
import { IconHeart as IconFavorite, IconRepost } from '@audius/harmony'
import cn from 'classnames'

import styles from './RepostFavoritesStats.module.css'

export enum Size {
  LARGE = 'large',
  SMALL = 'small'
}

type RepostFavoritesStatsProps = {
  isUnlisted: boolean
  repostCount: number
  saveCount: number
  onClickReposts?: () => void
  onClickFavorites?: () => void
  className?: string
  size?: Size
}

const messages = {
  reposts: 'Repost',
  favorites: 'Favorite'
}

const RepostFavoritesStats = ({
  isUnlisted,
  repostCount,
  saveCount,
  onClickReposts,
  onClickFavorites,
  className,
  size = Size.LARGE
}: RepostFavoritesStatsProps) => {
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

  if (isUnlisted) return null
  return !!repostCount || !!saveCount ? (
    <div
      className={cn(styles.statsRow, className, {
        [styles.small]: size === Size.SMALL
      })}
    >
      {!!repostCount && (
        <div className={styles.statItem} onClick={handleOnClickReposts}>
          <IconRepost />
          <span>{formatCount(repostCount)}</span>
          {size === Size.LARGE && pluralize(messages.reposts, repostCount)}
        </div>
      )}
      {!!saveCount && (
        <div className={styles.statItem} onClick={handleOnClickFavorites}>
          <div className={styles.iconFavorite}>
            <IconFavorite />
          </div>
          <span>{formatCount(saveCount)}</span>
          {size === Size.LARGE && pluralize(messages.favorites, saveCount)}
        </div>
      )}
    </div>
  ) : null
}

export default RepostFavoritesStats
