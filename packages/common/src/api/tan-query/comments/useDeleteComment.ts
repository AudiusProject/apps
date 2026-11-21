import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cloneDeep } from 'lodash'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { Comment, ID, ReplyComment } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { COMMENT_LIST_MUTATION_KEY, messages } from './types'
import {
  getCommentQueryKey,
  getTrackCommentListQueryKey,
  subtractCommentCount
} from './utils'

export type DeleteCommentArgs = {
  commentId: ID
  userId: ID
  trackId: ID
  currentSort: any
  parentCommentId?: ID
}

export const useDeleteComment = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  return useMutation({
    mutationKey: COMMENT_LIST_MUTATION_KEY,
    mutationFn: async ({ commentId, userId }: DeleteCommentArgs) => {
      const commentData = {
        userId: Id.parse(userId),
        commentId: Id.parse(commentId)
      }
      const sdk = await audiusSdk()
      return await sdk.comments.deleteComment(commentData)
    },
    onMutate: ({ commentId, trackId, currentSort, parentCommentId }) => {
      subtractCommentCount(queryClient, trackId)
      if (parentCommentId) {
        queryClient.setQueryData(
          getCommentQueryKey(parentCommentId),
          (prev) =>
            ({
              ...prev,
              replies: ((prev as Comment)?.replies ?? []).filter(
                (reply: ReplyComment) => reply.id !== commentId
              ),
              replyCount: ((prev as Comment)?.replyCount ?? 0) - 1
            }) as Comment
        )
      } else {
        const existingCommentData = queryClient.getQueryData(
          getCommentQueryKey(commentId)
        )
        const hasReplies =
          existingCommentData &&
          'replies' in existingCommentData &&
          (existingCommentData?.replies?.length ?? 0) > 0

        if (hasReplies) {
          queryClient.setQueryData(
            getCommentQueryKey(commentId),
            (prevCommentData) =>
              ({
                ...prevCommentData,
                isTombstone: true,
                userId: undefined,
                message: '[Removed]'
                // Intentionally undoing the userId
              }) as Comment & { userId?: undefined }
          )
        } else {
          queryClient.setQueryData(
            getTrackCommentListQueryKey({
              trackId,
              sortMethod: currentSort
            }),
            (prevCommentData) => {
              const newCommentData = cloneDeep(prevCommentData)
              if (!newCommentData) return
              newCommentData.pages = newCommentData.pages.map((page: ID[]) =>
                page.filter((id: ID) => id !== commentId)
              )
              return newCommentData
            }
          )
          queryClient.removeQueries({
            queryKey: getCommentQueryKey(commentId),
            exact: true
          })
        }
      }
    },

    onError: (error: Error, args) => {
      const { trackId, currentSort } = args
      console.error(error)
      dispatch(toast({ content: messages.mutationError('deleting') }))
      queryClient.resetQueries({
        queryKey: getTrackCommentListQueryKey({
          trackId,
          sortMethod: currentSort
        })
      })
    }
  })
}
