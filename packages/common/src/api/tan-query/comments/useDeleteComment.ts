import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cloneDeep } from 'lodash'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { Comment, Feature, ID, ReplyComment } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { messages } from './types'
import {
  getCommentQueryKey,
  getTrackCommentListQueryKey,
  subtractCommentCount
} from './utils'

export type DeleteCommentArgs = {
  commentId: ID
  userId: ID
  trackId: ID // track id
  currentSort: any
  parentCommentId?: ID
}

export const useDeleteComment = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  return useMutation({
    mutationFn: async ({ commentId, userId }: DeleteCommentArgs) => {
      const commentData = { userId, entityId: commentId }
      const sdk = await audiusSdk()
      return await sdk.comments.deleteComment(commentData)
    },
    onMutate: ({ commentId, trackId, currentSort, parentCommentId }) => {
      // Subtract from the comment count
      subtractCommentCount(queryClient, trackId)
      // If reply, filter it from the parent's list of replies
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
          // If not a reply & has no replies, remove from the sort list
          queryClient.setQueryData(
            getTrackCommentListQueryKey({
              trackId,
              sortMethod: currentSort
            }),
            (prevCommentData) => {
              const newCommentData = cloneDeep(prevCommentData)
              if (!newCommentData) return
              // Filter out the comment from its current page
              newCommentData.pages = newCommentData.pages.map((page: ID[]) =>
                page.filter((id: ID) => id !== commentId)
              )
              return newCommentData
            }
          )
          // Remove the individual comment
          queryClient.removeQueries({
            queryKey: getCommentQueryKey(commentId),
            exact: true
          })
        }
      }
    },

    onError: (error: Error, args) => {
      const { trackId, currentSort } = args
      reportToSentry({
        error,
        additionalInfo: args,
        name: 'Comments',
        feature: Feature.Comments
      })
      // Toast standard error message
      dispatch(toast({ content: messages.mutationError('deleting') }))
      // Since this mutation handles sort data, its difficult to undo the optimistic update so we just re-load everything
      // TODO: avoid hard reset here by checking if cache changed?
      queryClient.resetQueries({
        queryKey: getTrackCommentListQueryKey({
          trackId,
          sortMethod: currentSort
        })
      })
    }
  })
}
