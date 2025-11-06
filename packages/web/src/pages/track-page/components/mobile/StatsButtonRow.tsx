import { formatCount } from '@audius/common/utils'
import {
  Flex,
  IconHeart as IconFavorite,
  IconMessage,
  IconPlay,
  IconRepost,
  PlainButton
} from '@audius/harmony'

type StatsButtonRowProps = {
  className?: string
  showListenCount: boolean
  showFavoriteCount: boolean
  showRepostCount: boolean
  showCommentCount: boolean
  listenCount?: number
  favoriteCount: number
  repostCount: number
  commentCount: number
  onClickFavorites: () => void
  onClickReposts: () => void
  onClickComments: () => void
}

// A row of stats, visible on playlist and tracks pages.
const StatsButtonRow = ({
  className,
  showListenCount,
  showFavoriteCount,
  showRepostCount,
  showCommentCount,
  favoriteCount,
  repostCount,
  commentCount,
  onClickFavorites,
  onClickReposts,
  onClickComments,
  listenCount = 0
}: StatsButtonRowProps) => {
  if (!showListenCount && !showFavoriteCount && !showRepostCount) return null

  const renderListenCount = () => (
    <PlainButton iconLeft={IconPlay}>{formatCount(listenCount)}</PlainButton>
  )

  const renderFavoriteCount = () => (
    <PlainButton iconLeft={IconFavorite} onClick={onClickFavorites}>
      {formatCount(favoriteCount)}
    </PlainButton>
  )

  const renderRepostCount = () => (
    <PlainButton onClick={onClickReposts} iconLeft={IconRepost}>
      {formatCount(repostCount)}
    </PlainButton>
  )

  const renderCommentCount = () => (
    <PlainButton onClick={onClickComments} iconLeft={IconMessage}>
      {formatCount(commentCount)}
    </PlainButton>
  )

  return (
    <Flex gap='xl' className={className} justifyContent='flex-start'>
      {showListenCount ? renderListenCount() : null}
      {showRepostCount ? renderRepostCount() : null}
      {showFavoriteCount ? renderFavoriteCount() : null}
      {showCommentCount ? renderCommentCount() : null}
    </Flex>
  )
}

export default StatsButtonRow
