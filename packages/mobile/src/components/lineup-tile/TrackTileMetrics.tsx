import { useCallback } from 'react'

import { useTrack } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { FavoriteType, Name } from '@audius/common/models'
import type { LineupBaseActions } from '@audius/common/store'
import {
  repostsUserListActions,
  favoritesUserListActions,
  RepostType
} from '@audius/common/store'
import { formatCount } from '@audius/common/utils'
import { useDispatch } from 'react-redux'

import { IconRepost, IconHeart, IconMessage } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { make, track as trackEvent } from 'app/services/analytics'

import { useCommentDrawer } from '../comments/CommentDrawerContext'

import { VanityMetric } from './VanityMetrics'

const { setFavorite } = favoritesUserListActions
const { setRepost } = repostsUserListActions

type RepostsMetricProps = {
  trackId: ID
}

export const RepostsMetric = (props: RepostsMetricProps) => {
  const { trackId } = props

  const { data: repostCount } = useTrack(trackId, {
    select: (track) => {
      return track.repost_count
    }
  })

  const dispatch = useDispatch()
  const navigation = useNavigation()

  const handlePress = useCallback(() => {
    dispatch(setRepost(trackId, RepostType.TRACK))
    navigation.push('Reposts', {
      id: trackId,
      repostType: RepostType.TRACK
    })
  }, [trackId, dispatch, navigation])

  if (!repostCount || repostCount === 0) return null

  return (
    <VanityMetric icon={IconRepost} onPress={handlePress}>
      {formatCount(repostCount)}
    </VanityMetric>
  )
}

type SavesMetricProps = {
  trackId: ID
}

export const SavesMetric = (props: SavesMetricProps) => {
  const { trackId } = props
  const { data: saveCount } = useTrack(trackId, {
    select: (track) => {
      return track.save_count
    }
  })

  const dispatch = useDispatch()
  const navigation = useNavigation()

  const handlePress = useCallback(() => {
    dispatch(setFavorite(trackId, FavoriteType.TRACK))
    navigation.push('Favorited', {
      id: trackId,
      favoriteType: FavoriteType.TRACK
    })
  }, [trackId, dispatch, navigation])

  if (!saveCount || saveCount === 0) return null

  return (
    <VanityMetric icon={IconHeart} onPress={handlePress}>
      {formatCount(saveCount)}
    </VanityMetric>
  )
}

type CommentMetricProps = {
  trackId: ID
  actions?: LineupBaseActions
  uid?: string
  showLeaveCommentText?: boolean
}

export const CommentMetric = (props: CommentMetricProps) => {
  const { trackId, actions, uid, showLeaveCommentText } = props
  const { open } = useCommentDrawer()
  const navigation = useNavigation()
  const { data: partialTrack } = useTrack(trackId, {
    select: (track) => {
      return {
        commentCount: track.comment_count,
        commentsDisabled: track.comments_disabled
      }
    }
  })
  const { commentCount, commentsDisabled } = partialTrack ?? {}

  const handlePress = useCallback(() => {
    open({
      entityId: trackId,
      navigation,
      autoFocusInput: false,
      uid,
      actions
    })

    trackEvent(
      make({
        eventName: Name.COMMENTS_CLICK_COMMENT_STAT,
        trackId,
        source: 'lineup'
      })
    )
  }, [open, trackId, navigation, uid, actions])

  if (commentCount === undefined || commentsDisabled) return null

  return (
    <VanityMetric icon={IconMessage} onPress={handlePress}>
      {commentCount === 0 && showLeaveCommentText
        ? 'Leave a comment'
        : formatCount(commentCount)}
    </VanityMetric>
  )
}

type PlayMetricProps = {
  trackId: ID
}

export const PlayMetric = (props: PlayMetricProps) => {
  const { trackId } = props
  const { data: playCount } = useTrack(trackId, {
    select: (track) => {
      return track.play_count
    }
  })
  if (!playCount || playCount === 0) return null

  return <VanityMetric disabled>{formatCount(playCount)} Plays</VanityMetric>
}
