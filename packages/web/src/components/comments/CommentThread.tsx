import { useState } from 'react'

import { useComment, useCommentReplies } from '@audius/common/api'
import { useCurrentCommentSection } from '@audius/common/context'
import { commentsMessages as messages } from '@audius/common/messages'
import { Comment, ID, Name, ReplyComment } from '@audius/common/models'
import {
  Box,
  Flex,
  IconCaretDown,
  IconCaretUp,
  PlainButton
} from '@audius/harmony'

import { track, make } from 'services/analytics'

import { CommentBlock } from './CommentBlock'
import { useHighlightedComment } from './useHighlightedComment'

export const CommentThread = ({ commentId }: { commentId: ID }) => {
  const { data: rootCommentData } = useComment(commentId)
  const rootComment = rootCommentData as Comment // We can safely assume that this is a parent comment
  const highlightedComment = useHighlightedComment()
  const highlightReplyId =
    highlightedComment?.parentCommentId === commentId
      ? highlightedComment?.id
      : null

  const { entityId } = useCurrentCommentSection()
  const [hasRequestedMore, setHasRequestedMore] = useState(false)
  const { isFetching: isFetchingReplies } = useCommentReplies(
    { commentId },
    { enabled: hasRequestedMore }
  )

  const [hiddenReplies, setHiddenReplies] = useState<{
    [parentCommentId: string]: boolean
  }>({})

  const toggleReplies = (commentId: ID) => {
    const newHiddenReplies = { ...hiddenReplies }
    newHiddenReplies[commentId] = !newHiddenReplies[commentId]
    setHiddenReplies(newHiddenReplies)

    track(
      make({
        eventName: newHiddenReplies[commentId]
          ? Name.COMMENTS_HIDE_REPLIES
          : Name.COMMENTS_SHOW_REPLIES,
        commentId,
        trackId: entityId
      })
    )
  }

  const handleLoadMoreReplies = () => {
    setHasRequestedMore(true)
  }

  // Combine the replies from the root comment and the additional loaded replies

  if (!rootComment) return null

  const { replyCount = 0 } = rootComment

  const hasReplies = replyCount > 0

  const replies = rootComment.replies ?? []

  const hasMoreReplies = replyCount >= 3 && replies.length < replyCount // note: hasNextPage is undefined when inactive - have to explicitly check for false

  return (
    <Flex direction='column' as='li'>
      <CommentBlock commentId={rootComment.id} />
      {hasReplies ? (
        <Flex direction='column' mt='l'>
          <Box alignSelf='flex-start' ph={80}>
            <PlainButton
              onClick={() => toggleReplies(rootComment.id)}
              variant='subdued'
              iconLeft={
                hiddenReplies[rootComment.id] ? IconCaretDown : IconCaretUp
              }
            >
              {hiddenReplies[rootComment.id]
                ? messages.showReplies(replyCount)
                : messages.hideReplies}
            </PlainButton>
          </Box>
          <Box
            css={{
              display: 'grid',
              gridTemplateRows: hiddenReplies[rootComment.id] ? '0fr' : '1fr',
              transition: 'grid-template-rows 0.25s ease-out'
            }}
          >
            <Flex direction='column' gap='l' css={{ overflow: 'hidden' }}>
              <Flex
                direction='column'
                pt='l'
                gap='l'
                as='ul'
                aria-label={messages.replies}
              >
                {highlightReplyId ? (
                  <Flex w='100%' key={highlightReplyId}>
                    <CommentBlock
                      commentId={highlightReplyId}
                      parentCommentId={rootComment.id}
                    />
                  </Flex>
                ) : null}
                {replies
                  ?.filter(
                    (reply: ReplyComment) => reply.id !== highlightReplyId
                  )
                  .map((reply: ReplyComment) => (
                    <Flex w='100%' key={reply.id} as='li'>
                      <CommentBlock
                        commentId={reply.id}
                        parentCommentId={rootComment.id}
                      />
                    </Flex>
                  ))}
              </Flex>

              {hasMoreReplies ? (
                <PlainButton
                  onClick={handleLoadMoreReplies}
                  variant='subdued'
                  css={{ width: 'max-content' }}
                  disabled={isFetchingReplies}
                  isLoading={isFetchingReplies}
                >
                  {messages.showMoreReplies}
                </PlainButton>
              ) : null}
            </Flex>
          </Box>
        </Flex>
      ) : null}
    </Flex>
  )
}
