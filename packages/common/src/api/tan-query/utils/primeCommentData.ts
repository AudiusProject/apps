import { QueryClient } from '@tanstack/react-query'

import { ReplyComment } from '~/models'

import { CommentOrReply } from '../comments/types'
import { getCommentQueryKey } from '../comments/utils'

/**
 * Primes the comment data in the query cache
 */
export const primeCommentData = ({
  comments,
  queryClient
}: {
  comments: CommentOrReply[]
  queryClient: QueryClient
}) => {
  // Populate individual comment cache
  comments.forEach((comment) => {
    queryClient.setQueryData(getCommentQueryKey(comment.id), comment)

    // Prime any replies if they exist
    if ('replies' in comment && comment.replies) {
      comment.replies.forEach((reply: ReplyComment) => {
        queryClient.setQueryData(getCommentQueryKey(reply.id), reply)
      })
    }
  })
}
