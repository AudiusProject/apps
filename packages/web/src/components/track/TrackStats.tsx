import { useGetCurrentUserId, useTrack } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { ID, Name } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { formatCount, isLongFormContent, pluralize } from '@audius/common/utils'
import {
  Flex,
  IconHeart,
  IconMessage,
  IconPlay,
  IconRepost,
  PlainButton
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { make, track as trackEvent } from 'services/analytics'
import * as userListActions from 'store/application/ui/userListModal/slice'
import {
  UserListEntityType,
  UserListType
} from 'store/application/ui/userListModal/types'

const messages = {
  repost: 'Repost',
  favorite: 'Favorite',
  comment: 'Comment',
  play: 'Play'
}

type TrackStatsProps = {
  trackId: ID
  scrollToCommentSection: () => void
}

export const TrackStats = (props: TrackStatsProps) => {
  const { trackId, scrollToCommentSection } = props
  const { data: partialTrack } = useTrack(trackId, {
    select: (track) => ({
      comment_count: track.comment_count,
      repost_count: track.repost_count,
      save_count: track.save_count,
      is_stream_gated: track.is_stream_gated,
      owner_id: track.owner_id,
      is_unlisted: track.is_unlisted,
      play_count: track.play_count,
      comments_disabled: track.comments_disabled,
      genre: track.genre
    })
  })
  const { data: currentUserId } = useGetCurrentUserId({})
  const dispatch = useDispatch()
  const { isEnabled: isCommentsEnabled } = useFeatureFlag(
    FeatureFlags.COMMENTS_ENABLED
  )

  const comment_count = partialTrack?.comment_count ?? 0

  if (!partialTrack) return null

  const {
    repost_count,
    save_count,
    comments_disabled,
    play_count,
    is_stream_gated,
    owner_id,
    is_unlisted
  } = partialTrack

  const isOwner = currentUserId === owner_id

  if (is_unlisted) return null

  const handleClickReposts = () => {
    dispatch(
      userListActions.setUsers({
        userListType: UserListType.REPOST,
        entityType: UserListEntityType.TRACK,
        id: trackId
      })
    )
    dispatch(userListActions.setVisibility(true))
  }

  const handleClickFavorites = () => {
    dispatch(
      userListActions.setUsers({
        userListType: UserListType.FAVORITE,
        entityType: UserListEntityType.TRACK,
        id: trackId
      })
    )
    dispatch(userListActions.setVisibility(true))
  }

  const handleClickComments = () => {
    scrollToCommentSection()
    trackEvent(
      make({
        eventName: Name.COMMENTS_CLICK_COMMENT_STAT,
        trackId,
        source: 'track_page'
      })
    )
  }

  return (
    <Flex gap='l' mh={-6}>
      {repost_count === 0 ? null : (
        <PlainButton
          iconLeft={IconRepost}
          onClick={handleClickReposts}
          size='large'
          variant='subdued'
        >
          {formatCount(repost_count)} {pluralize(messages.repost, repost_count)}
        </PlainButton>
      )}
      {save_count === 0 ? null : (
        <PlainButton
          iconLeft={IconHeart}
          onClick={handleClickFavorites}
          size='large'
          variant='subdued'
        >
          {formatCount(save_count)} {pluralize(messages.favorite, save_count)}
        </PlainButton>
      )}
      {!isCommentsEnabled || comments_disabled || comment_count === 0 ? null : (
        <PlainButton
          iconLeft={IconMessage}
          onClick={handleClickComments}
          size='large'
          variant='subdued'
        >
          {formatCount(comment_count)}{' '}
          {pluralize(messages.comment, comment_count)}
        </PlainButton>
      )}
      {play_count > 0 &&
      isLongFormContent(partialTrack) &&
      (isOwner || !is_stream_gated) ? (
        <PlainButton iconLeft={IconPlay}>
          {formatCount(play_count)} {pluralize(messages.play, play_count)}
        </PlainButton>
      ) : null}
    </Flex>
  )
}
