import { useCallback, useMemo } from 'react'

import { useComment, useUser } from '@audius/common/api'
import { useCurrentCommentSection } from '@audius/common/context'
import {
  Name,
  type Comment,
  type ID,
  type ReplyComment
} from '@audius/common/models'
import { dayjs } from '@audius/common/utils'
import { css } from '@emotion/native'
import { useLinkProps } from '@react-navigation/native'
import type { GestureResponderEvent } from 'react-native'
import { TouchableOpacity } from 'react-native'
import Animated, { FadeIn, Keyframe } from 'react-native-reanimated'

import { Flex, Text, useTheme } from '@audius/harmony-native'
import { make, track as trackEvent } from 'app/services/analytics'

import { ProfilePicture } from '../core/ProfilePicture'
import { Skeleton } from '../skeleton'
import { UserLink } from '../user-link'

import { ArtistPick } from './ArtistPick'
import { CommentActionBar } from './CommentActionBar'
import { CommentBadge } from './CommentBadge'
import { CommentText } from './CommentText'
import { Timestamp } from './Timestamp'
import { TimestampLink } from './TimestampLink'

export type CommentBlockProps = {
  commentId: ID
  parentCommentId?: ID
  highlightedCommentId?: ID
  isPreview?: boolean
}

export const CommentBlockInternal = (
  props: Omit<CommentBlockProps, 'commentId'> & {
    comment: Comment | ReplyComment
  }
) => {
  const { comment, isPreview, parentCommentId, highlightedCommentId } = props
  const { artistId, track, navigation, closeDrawer } =
    useCurrentCommentSection()
  const {
    id: commentId,
    message,
    mentions = [],
    trackTimestampS,
    createdAt,
    userId,
    isEdited,
    isArtistReacted
  } = comment
  const isTombstone = 'isTombstone' in comment ? !!comment.isTombstone : false
  const isPinned = track.pinned_comment_id === commentId
  const isHighlighted = highlightedCommentId === commentId

  const { color, spacing, type } = useTheme()
  const { isPending: isUserPending } = useUser(userId)
  const { onPress: onPressProfilePic, ...profilePicLinkProps } = useLinkProps({
    screen: 'Profile',
    params: { id: userId }
  })

  const handlePressProfilePic = useCallback(() => {
    closeDrawer?.()
    onPressProfilePic()
  }, [closeDrawer, onPressProfilePic])

  const handlePressTimestamp = useCallback(
    (e: GestureResponderEvent, timestampSeconds: number) => {
      trackEvent(
        make({
          eventName: Name.COMMENTS_CLICK_TIMESTAMP,
          commentId,
          timestamp: timestampSeconds
        })
      )
    },
    [commentId]
  )

  const highlightBackgroundFadeAnimation = useMemo(
    () =>
      new Keyframe({
        0: {
          backgroundColor: 'transparent'
        },
        50: {
          backgroundColor:
            color.focus.default.slice(0, 7) + (type === 'dark' ? '33' : '1a')
        },
        100: {
          backgroundColor:
            color.focus.default.slice(0, 7) + (type === 'dark' ? '20' : '0D')
        }
      }),
    [color.focus.default, type]
  )

  const isCommentByArtist = userId === artistId

  return (
    <Animated.View style={{ width: '100%' }} entering={FadeIn.duration(500)}>
      <Animated.View
        entering={
          isHighlighted
            ? highlightBackgroundFadeAnimation.duration(660).delay(800)
            : undefined
        }
        style={css({
          display: 'flex',
          flexDirection: 'row',
          paddingVertical: isHighlighted ? spacing.unit2 : 0,
          paddingHorizontal: spacing.unit4,
          paddingLeft: parentCommentId ? spacing.unit10 : spacing.unit4,
          width: '100%',
          gap: spacing.unit2,
          opacity: isTombstone ? 0.5 : 1,
          backgroundColor: 'transparent'
        })}
      >
        <TouchableOpacity
          {...profilePicLinkProps}
          onPress={handlePressProfilePic}
        >
          <ProfilePicture
            style={{ width: 32, height: 32, flexShrink: 0 }}
            userId={userId}
            borderWidth='thin'
          />
        </TouchableOpacity>
        <Flex
          gap='s'
          w='100%'
          alignItems='flex-start'
          style={{ flexShrink: 1 }}
        >
          <Flex gap='2xs'>
            {!isPreview && (isPinned || isArtistReacted) ? (
              <Flex
                row
                justifyContent='space-between'
                w='100%'
                alignItems='center'
              >
                <ArtistPick isLiked={isArtistReacted} isPinned={isPinned} />
                {userId ? (
                  <CommentBadge
                    isArtist={isCommentByArtist}
                    commentUserId={userId}
                  />
                ) : null}
              </Flex>
            ) : null}
            {!isTombstone ? (
              <Flex
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                w='100%'
              >
                <Flex direction='row' gap='s' alignItems='center'>
                  {isUserPending ? <Skeleton width={80} height={18} /> : null}
                  {!isUserPending && userId ? (
                    <UserLink
                      userId={userId}
                      strength='strong'
                      onPress={closeDrawer}
                      lineHeight='single'
                      textLinkStyle={{ lineHeight: 20 }}
                    />
                  ) : null}
                  <Flex direction='row' gap='xs' alignItems='center' h='100%'>
                    <Timestamp time={dayjs.utc(createdAt).toDate()} />
                    {trackTimestampS !== undefined && !isPreview ? (
                      <>
                        <Text color='subdued' size='s'>
                          •
                        </Text>

                        <TimestampLink
                          size='s'
                          timestampSeconds={trackTimestampS}
                          onPress={handlePressTimestamp}
                        />
                      </>
                    ) : null}
                  </Flex>
                </Flex>
                {userId && (isPreview || !(isPinned || isArtistReacted)) ? (
                  <CommentBadge
                    isArtist={isCommentByArtist}
                    commentUserId={userId}
                  />
                ) : null}
              </Flex>
            ) : null}
          </Flex>
          <CommentText
            isEdited={isEdited && !isTombstone}
            isPreview={isPreview}
            commentId={commentId}
            mentions={mentions}
            trackDuration={track.duration}
            navigation={navigation}
            onCloseDrawer={closeDrawer}
          >
            {message}
          </CommentText>
          {!isPreview ? (
            <CommentActionBar
              comment={comment}
              isDisabled={isTombstone}
              hideReactCount={isTombstone}
              parentCommentId={parentCommentId}
            />
          ) : null}
        </Flex>
      </Animated.View>
    </Animated.View>
  )
}

// This is an extra component wrapper because the comment data coming back from aquery could be undefined
// There's no way to return early in the above component due to rules of hooks ordering
export const CommentBlock = (props: CommentBlockProps) => {
  const { data: comment } = useComment(props.commentId)
  if (!comment || !('id' in comment)) return null
  return <CommentBlockInternal {...props} comment={comment} />
}
