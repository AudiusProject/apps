import { useCallback } from 'react'

import { useTrack } from '@audius/common/api'
import { FavoriteType, ID } from '@audius/common/models'
import {
  favoritesUserListActions,
  repostsUserListActions,
  RepostType
} from '@audius/common/store'
import { formatCount, route, pluralize } from '@audius/common/utils'
import { IconMessage, Text, Flex, IconRepost, IconHeart } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { AvatarList } from 'components/avatar'
import { UserName, VanityMetric } from 'components/entity/VanityMetrics'
import { TrackTileSize } from 'components/track/types'
import { useIsMobile } from 'hooks/useIsMobile'
import {
  setUsers,
  setVisibility
} from 'store/application/ui/userListModal/slice'
import {
  UserListEntityType,
  UserListType
} from 'store/application/ui/userListModal/types'
import { push } from 'utils/navigation'

const messages = {
  favorites: 'Favorites',
  reposts: 'Reposts',
  comments: 'Comments'
}

const { REPOSTING_USERS_ROUTE, FAVORITING_USERS_ROUTE } = route

const { setFavorite } = favoritesUserListActions
const { setRepost } = repostsUserListActions

type RepostsMetricProps = {
  trackId: ID
  size?: TrackTileSize
}

export const RepostsMetric = (props: RepostsMetricProps) => {
  const { trackId, size } = props
  const { data: partialTrack } = useTrack(trackId, {
    select: (track) => {
      return {
        repostCount: track?.repost_count,
        followeeReposts: track?.followee_reposts
      }
    }
  })
  const { repostCount, followeeReposts } = partialTrack ?? {}

  const isMobile = useIsMobile()
  const dispatch = useDispatch()

  const handleClick = useCallback(() => {
    if (isMobile) {
      dispatch(setRepost(trackId, RepostType.TRACK))
      dispatch(push(REPOSTING_USERS_ROUTE))
    } else {
      dispatch(
        setUsers({
          userListType: UserListType.REPOST,
          entityType: UserListEntityType.TRACK,
          id: trackId
        })
      )
      dispatch(setVisibility(true))
    }
  }, [dispatch, isMobile, trackId])

  if (!repostCount || followeeReposts === undefined) return null

  const renderName = () => {
    const [{ user_id }] = followeeReposts

    const remainingCount = repostCount - 1
    const remainingText =
      remainingCount > 0
        ? ` + ${formatCount(remainingCount)} ${pluralize(
            'Repost',
            remainingCount
          )}`
        : ' Reposted'

    return (
      <Text>
        <UserName userId={user_id} />
        {remainingText}
      </Text>
    )
  }

  const isLargeSize = size === TrackTileSize.LARGE && !isMobile
  const shouldRenderName = isLargeSize && followeeReposts.length > 0

  return (
    <VanityMetric onClick={handleClick}>
      {isLargeSize && followeeReposts.length >= 3 ? (
        <AvatarList users={followeeReposts.map(({ user_id }) => user_id)} />
      ) : null}
      <Flex gap='xs'>
        <IconRepost
          size='s'
          color='subdued'
          title={shouldRenderName ? undefined : messages.reposts}
        />
        {shouldRenderName ? renderName() : formatCount(repostCount)}
      </Flex>
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
  const isMobile = useIsMobile()
  const dispatch = useDispatch()

  const handleClick = useCallback(() => {
    if (isMobile) {
      dispatch(setFavorite(trackId, FavoriteType.TRACK))
      dispatch(push(FAVORITING_USERS_ROUTE))
    } else {
      dispatch(
        setUsers({
          userListType: UserListType.FAVORITE,
          entityType: UserListEntityType.TRACK,
          id: trackId
        })
      )
      dispatch(setVisibility(true))
    }
  }, [dispatch, isMobile, trackId])

  if (!saveCount) return null

  return (
    <VanityMetric onClick={handleClick}>
      <IconHeart size='s' color='subdued' title={messages.favorites} />
      {formatCount(saveCount)}
    </VanityMetric>
  )
}

type CommentMetricProps = {
  trackId: ID
  size: TrackTileSize
}

export const CommentMetric = (props: CommentMetricProps) => {
  const { trackId, size } = props
  const isMobile = useIsMobile()
  const { data: partialTrack } = useTrack(trackId, {
    select: (track) => {
      return {
        commentCount: track?.comment_count,
        permalink: track?.permalink,
        commentsDisabled: track?.comments_disabled
      }
    }
  })
  const { commentCount = 0, permalink, commentsDisabled } = partialTrack ?? {}

  if (commentsDisabled) return null

  const url = isMobile
    ? `${permalink}/comments`
    : `${permalink}?showComments=true`
  const isSmall = size === TrackTileSize.SMALL

  return (
    <VanityMetric ellipses to={url}>
      <IconMessage size='s' color='subdued' title={messages.comments} />
      {commentCount > 0 || isSmall
        ? formatCount(commentCount)
        : 'Leave a comment'}
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

  if (!playCount) return null

  return <VanityMetric disabled>{formatCount(playCount)} Plays</VanityMetric>
}
