import { useContext, useMemo, useState } from 'react'

import { useComment, useGetUserById } from '@audius/common/api'
import {
  useCurrentCommentSection,
  useDeleteComment
} from '@audius/common/context'
import { commentsMessages as messages } from '@audius/common/messages'
import { Comment, ID, ReplyComment, Status } from '@audius/common/models'
import { cacheUsersSelectors } from '@audius/common/store'
import { dayjs } from '@audius/common/utils'
import {
  Box,
  Flex,
  PlainButton,
  Skeleton,
  Text,
  useTheme
} from '@audius/harmony'
import { keyframes } from '@emotion/react'
import { useSelector } from 'react-redux'

import { Avatar } from 'components/avatar'
import { UserLink } from 'components/link'
import { ToastContext } from 'components/toast/ToastContext'
import { AppState } from 'store/types'

import { ArtistPick } from './ArtistPick'
import { CommentActionBar } from './CommentActionBar'
import { CommentBadge } from './CommentBadge'
import { CommentForm } from './CommentForm'
import { CommentText } from './CommentText'
import { Timestamp } from './Timestamp'
import { TimestampLink } from './TimestampLink'
const { getUser } = cacheUsersSelectors

type CommentBlockProps = {
  commentId: ID
  parentCommentId?: ID
  isPreview?: boolean
}

const fadeIn = keyframes`
  0% {
    filter: opacity(0);
  }
  100% {
    filter: opacity(1);
  }
`

const CommentBlockInternal = (
  props: Omit<CommentBlockProps, 'commentId'> & {
    comment: Comment | ReplyComment
  }
) => {
  const { comment, parentCommentId, isPreview } = props
  const { track, artistId } = useCurrentCommentSection()

  const {
    id: commentId,
    message,
    trackTimestampS,
    createdAt,
    userId,
    isEdited,
    isArtistReacted,
    mentions = []
  } = comment

  const { motion } = useTheme()
  const isPinned = track.pinned_comment_id === commentId
  const isTombstone = 'isTombstone' in comment ? !!comment.isTombstone : false
  const createdAtDate = useMemo(
    () => dayjs.utc(createdAt).toDate(),
    [createdAt]
  )

  const userHandle = useSelector(
    (state: AppState) => getUser(state, { id: userId })?.handle
  )

  const [deleteComment] = useDeleteComment()
  const { toast } = useContext(ToastContext)

  // triggers a fetch to get user profile info
  const { status } = useGetUserById({ id: userId })
  const isLoadingUser = status === Status.LOADING

  const [showEditInput, setShowEditInput] = useState(false)
  const [showReplyInput, setShowReplyInput] = useState(false)
  const isCommentByArtist = userId === artistId

  return (
    <Flex
      w='100%'
      gap='l'
      css={{
        opacity: isTombstone ? 0.5 : 1,
        animation: `${fadeIn} ${motion.calm}`
      }}
    >
      <Box>
        <Avatar userId={userId} size='medium' popover alignSelf='flex-start' />
      </Box>
      <Flex direction='column' w='100%' gap='s' alignItems='flex-start'>
        <Flex column gap='xs' w='100%'>
          {!isPreview && (isPinned || isArtistReacted) ? (
            <Flex justifyContent='space-between' alignItems='center'>
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
            <Flex justifyContent='space-between' alignItems='center'>
              <Flex gap='s' alignItems='center'>
                {isLoadingUser ? <Skeleton w={80} h={18} /> : null}
                {userId ? (
                  <UserLink
                    userId={userId}
                    popover
                    size='l'
                    strength='strong'
                  />
                ) : null}
                <Flex gap='xs' alignItems='flex-end' h='100%'>
                  <Timestamp time={createdAtDate} />
                  {trackTimestampS !== undefined && !isPreview ? (
                    <>
                      <Text color='subdued' size='s'>
                        •
                      </Text>
                      <TimestampLink
                        size='s'
                        timestampSeconds={trackTimestampS}
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
        {showEditInput ? (
          <Flex w='100%' direction='column' gap='s'>
            <CommentForm
              autoFocus
              onSubmit={() => setShowEditInput(false)}
              commentId={commentId}
              initialValue={message}
              initialUserMentions={mentions}
              isEdit
              hideAvatar
            />
            <PlainButton
              css={{ alignSelf: 'flex-end' }}
              onClick={() => setShowEditInput(false)}
            >
              Cancel
            </PlainButton>
          </Flex>
        ) : (
          <CommentText
            isEdited={isEdited && !isTombstone}
            isPreview={isPreview}
            mentions={mentions}
            commentId={commentId}
            duration={track.duration}
          >
            {message}
          </CommentText>
        )}
        <Flex column gap='xs' w='100%'>
          {isPreview ? null : (
            <CommentActionBar
              comment={comment}
              onClickReply={() => setShowReplyInput((prev) => !prev)}
              onClickEdit={() => setShowEditInput((prev) => !prev)}
              onClickDelete={() => {
                deleteComment(commentId, parentCommentId)
                toast(messages.toasts.deleted)
              }}
              isDisabled={isTombstone || showReplyInput}
              hideReactCount={isTombstone}
              parentCommentId={parentCommentId}
            />
          )}

          {showReplyInput && userId !== undefined ? (
            <Flex w='100%' direction='column' gap='s'>
              <CommentForm
                autoFocus
                parentCommentId={parentCommentId ?? comment.id}
                initialValue={`@${userHandle} `}
                initialUserMentions={
                  userHandle ? [{ userId, handle: userHandle }] : []
                }
                onSubmit={() => setShowReplyInput(false)}
              />
              <PlainButton
                css={{ alignSelf: 'flex-end' }}
                onClick={() => {
                  setShowReplyInput(false)
                }}
              >
                Cancel
              </PlainButton>
            </Flex>
          ) : null}
        </Flex>
      </Flex>
    </Flex>
  )
}

// This is an extra component wrapper because the comment data coming back from tan-query could be undefined
// There's no way to return early in the above component due to rules of hooks ordering
export const CommentBlock = (props: CommentBlockProps) => {
  const { data: comment } = useComment(props.commentId)
  if (!comment || !('id' in comment)) return null
  return <CommentBlockInternal {...props} comment={comment} />
}
