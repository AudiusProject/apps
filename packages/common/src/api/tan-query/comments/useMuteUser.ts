import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cloneDeep } from 'lodash'
import { useDispatch } from 'react-redux'

import { useAudiusQueryContext } from '~/audius-query'
import { Comment, Feature, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { messages } from './types'
import {
  getCommentQueryKey,
  getTrackCommentCountQueryKey,
  getTrackCommentListQueryKey
} from './utils'

export type MuteUserArgs = {
  mutedUserId: ID
  userId: ID
  isMuted: boolean
  trackId?: ID
  currentSort?: any
}

export const useMuteUser = () => {
  const { audiusSdk, reportToSentry } = useAudiusQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  return useMutation({
    mutationFn: async ({ userId, mutedUserId, isMuted }: MuteUserArgs) => {
      const sdk = await audiusSdk()
      await sdk.comments.muteUser(userId, mutedUserId, isMuted)
    },
    onMutate: ({ trackId, mutedUserId, currentSort }) => {
      // Optimistic update - filter out the comment
      if (trackId !== undefined && currentSort !== undefined) {
        queryClient.setQueryData(
          getTrackCommentListQueryKey({
            trackId,
            sortMethod: currentSort
          }),
          (prevData) => {
            if (!prevData) return
            const newState = cloneDeep(prevData)
            // Filter out any comments by the muted user
            newState.pages = newState.pages.map((page) =>
              page.filter((id) => {
                const rootComment = queryClient.getQueryData(
                  getCommentQueryKey(id)
                ) as Comment | undefined
                if (!rootComment) return false
                // Check for any replies by our muted user first
                if (
                  rootComment.replies &&
                  (rootComment.replies.length ?? 0) > 0
                ) {
                  // Keep track of count
                  const prevReplyCount = rootComment.replies.length
                  // Filter out replies by the muted user
                  rootComment.replies = rootComment.replies.filter((reply) => {
                    if (reply.userId === mutedUserId) {
                      queryClient.resetQueries({
                        queryKey: getCommentQueryKey(reply.id)
                      })
                      return false
                    }
                    return true
                  })
                  // Subtract how many replies were removed from total reply count
                  // NOTE: remember that not all replies by the user may be showing due to pagination
                  rootComment.replyCount =
                    (rootComment.replyCount ?? 0) -
                    (prevReplyCount - rootComment.replies.length)
                }

                // Finally if the root comment is by the muted user, remove it
                if (rootComment?.userId === mutedUserId) {
                  queryClient.resetQueries({
                    queryKey: getCommentQueryKey(rootComment.id)
                  })
                  return false
                }
                return true
              })
            )
            // Rather than track the comment count, we just trigger another query to get the new count (since we poll often anyways)
            queryClient.resetQueries({
              queryKey: getTrackCommentCountQueryKey(trackId)
            })
            return newState
          }
        )
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
      // Generic toast error
      dispatch(toast({ content: messages.muteUserError }))

      // No way to know what comment count should be here, so we just reset the query data
      queryClient.resetQueries({
        queryKey: ['trackCommentCount', trackId]
      })
      // Reload data
      queryClient.resetQueries({
        queryKey: ['trackCommentList', trackId, currentSort]
      })
    }
  })
}
