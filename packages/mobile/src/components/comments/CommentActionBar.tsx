import { useCallback, useState } from 'react'

import {
  useCurrentCommentSection,
  useReactToComment
} from '@audius/common/context'
import { commentsMessages as messages } from '@audius/common/messages'
import { type Comment, type ID, type ReplyComment } from '@audius/common/models'

import { Box, Flex, PlainButton, Text } from '@audius/harmony-native'

import { FavoriteButton } from '../favorite-button'

import { CommentOverflowMenu } from './CommentOverflowMenu'

type CommentActionBarProps = {
  comment: Comment | ReplyComment
  isDisabled?: boolean
  hideReactCount?: boolean
  parentCommentId?: ID
}
export const CommentActionBar = (props: CommentActionBarProps) => {
  const { isDisabled, comment, hideReactCount, parentCommentId } = props
  const { isCurrentUserReacted, reactCount, id: commentId } = comment

  const [reactToComment] = useReactToComment()
  const [reactionState, setReactionState] = useState(isCurrentUserReacted) // TODO: need to pull starting value from metadata
  const { setReplyingAndEditingState } = useCurrentCommentSection()

  const handleCommentReact = useCallback(() => {
    setReactionState(!reactionState)
    reactToComment(commentId, !reactionState)
  }, [commentId, reactToComment, reactionState])

  const handleReply = useCallback(() => {
    setReplyingAndEditingState?.({
      replyingToComment: comment,
      replyingToCommentId: parentCommentId ?? comment.id
    })
  }, [comment, parentCommentId, setReplyingAndEditingState])

  return (
    <>
      <Flex direction='row' gap='l' alignItems='center'>
        <Flex direction='row' alignItems='center' gap='xs'>
          <FavoriteButton
            onPress={handleCommentReact}
            isActive={reactionState}
            wrapperStyle={{ height: 20, width: 20 }}
            isDisabled={isDisabled}
          />
          {!hideReactCount && reactCount > 0 ? (
            <Text color='default' size='s'>
              {reactCount}
            </Text>
          ) : (
            // Placeholder box to offset where the number would be
            <Box w='8px' />
          )}
        </Flex>
        <PlainButton
          variant='subdued'
          onPress={handleReply}
          disabled={isDisabled}
        >
          {messages.reply}
        </PlainButton>
        <CommentOverflowMenu
          comment={comment}
          disabled={isDisabled}
          parentCommentId={parentCommentId}
        />
      </Flex>
    </>
  )
}
