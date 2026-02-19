import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cloneDeep } from 'lodash'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { Feature, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'
import { Nullable } from '~/utils'

import { getTrackQueryKey } from '../tracks/useTrack'

import { messages } from './types'
import { getTrackCommentListQueryKey } from './utils'

export type PinCommentArgs = {
  commentId: ID
  userId: ID
  isPinned: boolean
  trackId: ID
  currentSort: any
  previousPinnedCommentId?: Nullable<ID>
}

export const usePinComment = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  return useMutation({
    mutationFn: async (args: PinCommentArgs) => {
      const { userId, commentId, isPinned, trackId } = args
      const sdk = await audiusSdk()
      return await sdk.comments.pinComment({
        userId,
        entityId: commentId,
        trackId,
        isPin: isPinned
      })
    },
    onMutate: ({ commentId, isPinned, trackId, currentSort }) => {
      if (isPinned) {
        // Loop through the sort list and move the newly pinned comment
        queryClient.setQueryData(
          getTrackCommentListQueryKey({ trackId, sortMethod: currentSort }),
          (prevCommentData) => {
            const newCommentData = cloneDeep(prevCommentData) ?? {
              pages: [],
              pageParams: [0]
            }
            let commentPages = newCommentData.pages
            // Filter out the comment from its current page
            commentPages = commentPages.map((page: ID[]) =>
              page.filter((id: ID) => id !== commentId)
            )
            // Insert our pinned comment id at the top of page 0
            if (commentPages.length > 0 && Array.isArray(commentPages[0])) {
              commentPages[0].unshift(commentId)
            } else if (commentPages.length === 0) {
              commentPages.push([commentId])
            }
            newCommentData.pages = commentPages
            return newCommentData
          }
        )
      }

      queryClient.setQueryData(
        getTrackQueryKey(trackId),
        (prevTrack) =>
          prevTrack && {
            ...prevTrack,
            pinned_comment_id: isPinned ? commentId : null
          }
      )
    },
    onError: (error: Error, args) => {
      const { trackId, currentSort, previousPinnedCommentId } = args
      reportToSentry({
        error,
        additionalInfo: args,
        name: 'Comments',
        feature: Feature.Comments
      })
      // Toast standard error message
      dispatch(toast({ content: messages.mutationError('pinning') }))
      queryClient.setQueryData(
        getTrackQueryKey(trackId),
        (prevTrack) =>
          prevTrack && {
            ...prevTrack,
            pinned_comment_id: previousPinnedCommentId ?? null
          }
      )
      // Since this mutationx handles sort data, its difficult to undo the optimistic update so we just re-load everything
      queryClient.resetQueries({
        queryKey: getTrackCommentListQueryKey({
          trackId,
          sortMethod: currentSort
        })
      })
    }
  })
}
