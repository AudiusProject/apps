import { formatCount } from '@audius/common/utils'

import {
  Flex,
  IconHeart,
  IconMessage,
  IconPlay,
  IconRepost,
  PlainButton
} from '@audius/harmony-native'
import type { GestureResponderHandler } from 'app/types/gesture'

type DetailsTileStatsProps = {
  playCount?: number
  repostCount?: number
  favoriteCount?: number
  commentCount?: number
  hidePlayCount?: boolean
  hideRepostCount?: boolean
  hideFavoriteCount?: boolean
  hideCommentCount?: boolean
  onPressFavorites?: GestureResponderHandler
  onPressReposts?: GestureResponderHandler
  onPressComments?: GestureResponderHandler
}

/**
 * The stats displayed on track and playlist screens
 */
export const DetailsTileStats = ({
  playCount = 0,
  repostCount = 0,
  favoriteCount = 0,
  commentCount = 0,
  hidePlayCount,
  hideRepostCount,
  hideFavoriteCount,
  hideCommentCount,
  onPressFavorites,
  onPressReposts,
  onPressComments
}: DetailsTileStatsProps) => {
  const shouldHidePlayCount = hidePlayCount || playCount <= 0
  const shouldHideRepostCount = hideRepostCount || repostCount <= 0
  const shouldHideFavoriteCount = hideFavoriteCount || favoriteCount <= 0
  const shouldHideCommentCount = hideCommentCount || commentCount <= 0
  if (
    shouldHideFavoriteCount &&
    shouldHideRepostCount &&
    shouldHidePlayCount &&
    shouldHideCommentCount
  ) {
    return null
  }

  return (
    <Flex
      w='100%'
      direction='row'
      gap='xl'
      alignItems='center'
      justifyContent='flex-start'
    >
      {shouldHidePlayCount ? null : (
        <PlainButton iconLeft={IconPlay}>{formatCount(playCount)}</PlainButton>
      )}
      {shouldHideRepostCount ? null : (
        <PlainButton onPress={onPressReposts} iconLeft={IconRepost}>
          {formatCount(repostCount)}
        </PlainButton>
      )}
      {shouldHideFavoriteCount ? null : (
        <PlainButton onPress={onPressFavorites} iconLeft={IconHeart}>
          {formatCount(favoriteCount)}
        </PlainButton>
      )}
      {shouldHideCommentCount ? null : (
        <PlainButton onPress={onPressComments} iconLeft={IconMessage}>
          {formatCount(commentCount)}
        </PlainButton>
      )}
    </Flex>
  )
}
