import { useMemo, useState } from 'react'

import { useGetCommentById, useGetUserById } from '@audius/common/api'
import {
  useCommentPostStatus,
  useCurrentCommentSection,
  useDeleteComment
} from '@audius/common/context'
import { useStatusChange } from '@audius/common/hooks'
import { Comment, ID, ReplyComment } from '@audius/common/models'
import { cacheUsersSelectors } from '@audius/common/store'
import { Box, Flex, Text } from '@audius/harmony'
import { useSelector } from 'react-redux'

import { Avatar } from 'components/avatar'
import { UserLink } from 'components/link'
import { AppState } from 'store/types'

import { ArtistPick } from './ArtistPick'
import { CommentActionBar } from './CommentActionBar'
import { CommentBadge } from './CommentBadge'
import { CommentForm } from './CommentForm'
import { CommentText } from './CommentText'
import { Timestamp } from './Timestamp'
import { TimestampLink } from './TimestampLink'
const { getUser } = cacheUsersSelectors

export type CommentBlockProps = {
  commentId: ID
  parentCommentId?: ID
  hideActions?: boolean
}

const CommentBlockInternal = (
  props: Omit<CommentBlockProps, 'commentId'> & {
    comment: Comment | ReplyComment
  }
) => {
  const { comment, parentCommentId, hideActions } = props

  const {
    id: commentId,
    message,
    trackTimestampS,
    createdAt,
    userId,
    isEdited,
    isArtistReacted
  } = comment

  const isParentComment = 'isPinned' in comment
  const isPinned = isParentComment ? comment.isPinned : false // pins dont exist on replies
  const isTombstone = isParentComment ? !!comment.isTombstone : false
  const createdAtDate = useMemo(() => new Date(createdAt), [createdAt])

  const userHandle = useSelector(
    (state: AppState) => getUser(state, { id: userId })?.handle
  )

  const { artistId } = useCurrentCommentSection()

  const [deleteComment] = useDeleteComment()

  // This status checks specifically for this comment - no matter where the post request originated
  const commentPostStatus = useCommentPostStatus(comment)

  useStatusChange(commentPostStatus, {
    onSuccess: () => setShowReplyInput(false)
  })

  // triggers a fetch to get user profile info
  useGetUserById({ id: userId }) // TODO: display a load state while fetching

  const [showEditInput, setShowEditInput] = useState(false)
  const [showReplyInput, setShowReplyInput] = useState(false)
  const isCommentByArtist = userId === artistId

  return (
    <Flex w='100%' gap='l' css={{ opacity: isTombstone ? 0.5 : 1 }}>
      <Box css={{ flexShrink: 0, width: 44 }}>
        <Avatar userId={userId} size='medium' popover />
      </Box>
      <Flex direction='column' gap='s' w='100%' alignItems='flex-start'>
        <Box css={{ position: 'absolute', top: 0, right: 0 }}>
          <CommentBadge isArtist={isCommentByArtist} commentUserId={userId} />
        </Box>
        {isPinned || isArtistReacted ? (
          <Flex justifyContent='space-between' w='100%'>
            <ArtistPick isLiked={isArtistReacted} isPinned={isPinned} />
          </Flex>
        ) : null}
        {!isTombstone ? (
          <Flex gap='s' alignItems='center'>
            <UserLink userId={userId} popover />
            <Flex gap='xs' alignItems='flex-end' h='100%'>
              <Timestamp time={createdAtDate} />
              {trackTimestampS !== undefined ? (
                <>
                  <Text color='subdued' size='xs'>
                    •
                  </Text>

                  <TimestampLink size='xs' timestampSeconds={trackTimestampS} />
                </>
              ) : null}
            </Flex>
          </Flex>
        ) : null}
        {showEditInput ? (
          <CommentForm
            onSubmit={() => setShowEditInput(false)}
            commentId={commentId}
            initialValue={message}
            isEdit
            hideAvatar
          />
        ) : (
          <CommentText isEdited={isEdited}>{message}</CommentText>
        )}
        {hideActions ? null : (
          <CommentActionBar
            comment={comment}
            onClickReply={() => setShowReplyInput((prev) => !prev)}
            onClickEdit={() => setShowEditInput((prev) => !prev)}
            onClickDelete={() => deleteComment(commentId)}
            isDisabled={isTombstone}
            hideReactCount={isTombstone}
          />
        )}

        {showReplyInput ? (
          <CommentForm
            parentCommentId={parentCommentId ?? comment.id}
            initialValue={`@${userHandle}`}
            onSubmit={() => setShowReplyInput(false)}
          />
        ) : null}
      </Flex>
    </Flex>
  )
}

// This is an extra component wrapper because the comment data coming back from aquery could be undefined
// There's no way to return early in the above component due to rules of hooks ordering
export const CommentBlock = (props: CommentBlockProps) => {
  const { data: comment } = useGetCommentById({ id: props.commentId })
  if (!comment) return null
  return <CommentBlockInternal {...props} comment={comment} />
}
