import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cloneDeep } from 'lodash'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { Comment, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { COMMENT_LIST_MUTATION_KEY, messages } from './types'
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
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  return useMutation({
    mutationKey: COMMENT_LIST_MUTATION_KEY,
    mutationFn: async ({ userId, mutedUserId, isMuted }: MuteUserArgs) => {
      const sdk = await audiusSdk()
      await sdk.comments.muteUser(userId, mutedUserId, isMuted)
    },
    onMutate: ({ trackId, mutedUserId, currentSort }) => {
      if (trackId !== undefined && currentSort !== undefined) {
        queryClient.setQueryData(
          getTrackCommentListQueryKey({
            trackId,
            sortMethod: currentSort
          }),
          (prevData) => {
            if (!prevData) return
            const newState = cloneDeep(prevData)
            newState.pages = newState.pages.map((page) =>
              page.filter((id) => {
                const rootComment = queryClient.getQueryData(
                  getCommentQueryKey(id)
                ) as Comment | undefined
                if (!rootComment) return false
                if (
                  rootComment.replies &&
                  (rootComment.replies.length ?? 0) > 0
                ) {
                  const prevReplyCount = rootComment.replies.length
                  rootComment.replies = rootComment.replies.filter((reply) => {
                    if (reply.userId === mutedUserId) {
                      queryClient.resetQueries({
                        queryKey: getCommentQueryKey(reply.id)
                      })
                      return false
                    }
                    return true
                  })
                  rootComment.replyCount =
                    (rootComment.replyCount ?? 0) -
                    (prevReplyCount - rootComment.replies.length)
                }

                if (rootComment?.userId === mutedUserId) {
                  queryClient.resetQueries({
                    queryKey: getCommentQueryKey(rootComment.id)
                  })
                  return false
                }
                return true
              })
            )
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
      console.error(error)
      dispatch(toast({ content: messages.muteUserError }))

      if (trackId === undefined) return
      queryClient.resetQueries({
        queryKey: getTrackCommentCountQueryKey(trackId)
      })
      if (currentSort !== undefined) {
        queryClient.resetQueries({
          queryKey: getTrackCommentListQueryKey({
            trackId,
            sortMethod: currentSort
          })
        })
      }
    }
  })
}
