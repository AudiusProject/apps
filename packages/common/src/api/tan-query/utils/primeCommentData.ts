import { QueryClient } from '@tanstack/react-query'

import { ReplyComment } from '~/models'

import { CommentOrReply } from '../comments/types'
import { getCommentQueryKey } from '../comments/utils'

export const primeCommentData = ({
  comments,
  queryClient
}: {
  comments: CommentOrReply[]
  queryClient: QueryClient
}) => {
  comments.forEach((comment) => {
    queryClient.setQueryData(getCommentQueryKey(comment.id), comment)

    if ('replies' in comment && comment.replies) {
      comment.replies.forEach((reply: ReplyComment) => {
        queryClient.setQueryData(getCommentQueryKey(reply.id), reply)
      })
    }
  })
}
