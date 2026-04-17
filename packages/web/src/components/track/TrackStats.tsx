import { useCurrentUserId, useTrack } from '@audius/common/api'
import { ID, Name } from '@audius/common/models'
import { formatCount, isLongFormContent, pluralize } from '@audius/common/utils'
import {
  Flex,
  IconHeart,
  IconMessage,
  IconPlay,
  IconRepost,
  PlainButton
} from '@audius/harmony'
import { pick } from 'lodash'
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
  showPlayCount?: boolean
  forceMobileStyle?: boolean
  className?: string
}

export const TrackStats = (props: TrackStatsProps) => {
  const {
    trackId,
    scrollToCommentSection,
    showPlayCount = false,
    forceMobileStyle = false,
    className
  } = props
  const { data: partialTrack } = useTrack(trackId, {
    select: (track) =>
      pick(track, [
        'comment_count',
        'repost_count',
        'save_count',
        'is_stream_gated',
        'owner_id',
        'is_unlisted',
        'play_count',
        'comments_disabled',
        'genre'
      ])
  })
  const { data: currentUserId } = useCurrentUserId()
  const dispatch = useDispatch()
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

  const shouldUseMobileRules = forceMobileStyle

  const shouldShowRepostCount = shouldUseMobileRules
    ? !is_unlisted
    : !is_unlisted && repost_count > 0
  const shouldShowFavoriteCount = shouldUseMobileRules
    ? !is_unlisted
    : !is_unlisted && save_count > 0
  const shouldShowCommentCount = shouldUseMobileRules
    ? !is_unlisted && !comments_disabled
    : !is_unlisted && !comments_disabled && comment_count > 0
  const shouldShowPlayCount =
    shouldUseMobileRules || showPlayCount
      ? isOwner || (!is_stream_gated && !is_unlisted)
      : play_count > 0 &&
        isLongFormContent(partialTrack) &&
        (isOwner || !is_stream_gated)

  if (
    !shouldShowRepostCount &&
    !shouldShowFavoriteCount &&
    !shouldShowCommentCount &&
    !shouldShowPlayCount
  ) {
    return null
  }

  const buttonSize = forceMobileStyle ? 'default' : 'large'
  const buttonVariant = forceMobileStyle ? 'default' : 'subdued'

  const renderStatLabel = (
    count: number,
    singular: string,
    hideLabelInCompactHeader = false
  ) =>
    forceMobileStyle
      ? formatCount(count)
      : hideLabelInCompactHeader
        ? [
            formatCount(count),
            <span key='label' data-track-stat-label='social'>
              {` ${pluralize(singular, count)}`}
            </span>
          ]
        : `${formatCount(count)} ${pluralize(singular, count)}`

  if (forceMobileStyle) {
    return (
      <Flex gap='xl' justifyContent='flex-start' className={className}>
        {shouldShowPlayCount ? (
          <PlainButton
            iconLeft={IconPlay}
            size={buttonSize}
            variant={buttonVariant}
          >
            {renderStatLabel(play_count, messages.play)}
          </PlainButton>
        ) : null}
        {shouldShowRepostCount ? (
          <PlainButton
            iconLeft={IconRepost}
            onClick={handleClickReposts}
            size={buttonSize}
            variant={buttonVariant}
          >
            {renderStatLabel(repost_count, messages.repost, true)}
          </PlainButton>
        ) : null}
        {shouldShowFavoriteCount ? (
          <PlainButton
            iconLeft={IconHeart}
            onClick={handleClickFavorites}
            size={buttonSize}
            variant={buttonVariant}
          >
            {renderStatLabel(save_count, messages.favorite, true)}
          </PlainButton>
        ) : null}
        {shouldShowCommentCount ? (
          <PlainButton
            iconLeft={IconMessage}
            onClick={handleClickComments}
            size={buttonSize}
            variant={buttonVariant}
          >
            {renderStatLabel(comment_count, messages.comment, true)}
          </PlainButton>
        ) : null}
      </Flex>
    )
  }

  return (
    <Flex gap={forceMobileStyle ? 'xl' : 'l'} className={className}>
      {shouldShowRepostCount ? (
        <PlainButton
          iconLeft={IconRepost}
          onClick={handleClickReposts}
          size={buttonSize}
          variant={buttonVariant}
        >
          {renderStatLabel(repost_count, messages.repost, true)}
        </PlainButton>
      ) : null}
      {shouldShowFavoriteCount ? (
        <PlainButton
          iconLeft={IconHeart}
          onClick={handleClickFavorites}
          size={buttonSize}
          variant={buttonVariant}
        >
          {renderStatLabel(save_count, messages.favorite, true)}
        </PlainButton>
      ) : null}
      {shouldShowCommentCount ? (
        <PlainButton
          iconLeft={IconMessage}
          onClick={handleClickComments}
          size={buttonSize}
          variant={buttonVariant}
        >
          {renderStatLabel(comment_count, messages.comment, true)}
        </PlainButton>
      ) : null}
      {shouldShowPlayCount ? (
        <PlainButton
          iconLeft={IconPlay}
          size={buttonSize}
          variant={buttonVariant}
        >
          {renderStatLabel(play_count, messages.play)}
        </PlainButton>
      ) : null}
    </Flex>
  )
}
