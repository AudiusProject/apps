import { EntityManagerAction, EntityType } from '@audius/sdk/services'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { Feature, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { CommentOrReply, messages } from './types'
import { getCommentQueryKey } from './utils'

export type UpdateCommentNotificationSettingArgs = {
  userId: ID
  commentId: ID
  action: EntityManagerAction.MUTE | EntityManagerAction.UNMUTE
}

export const useUpdateCommentNotificationSetting = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  return useMutation({
    mutationFn: async (args: UpdateCommentNotificationSettingArgs) => {
      const { userId, commentId, action } = args
      const sdk = await audiusSdk()
      await sdk.comments.updateCommentNotificationSetting({
        userId,
        entityId: commentId,
        entityType: EntityType.COMMENT,
        action
      })
    },
    onMutate: ({ commentId, action }) => {
      queryClient.setQueryData(getCommentQueryKey(commentId), (prevData) => {
        if (prevData) {
          return {
            ...prevData,
            isMuted: action === EntityManagerAction.MUTE
          } as CommentOrReply
        }
        // TODO: this might be a bug. Shouldn't be storing non-CommentOrReply data in the cache
        return {
          isMuted: action === EntityManagerAction.MUTE
        } as CommentOrReply
      })
    },
    onError: (error: Error, args) => {
      const { commentId } = args
      reportToSentry({
        error,
        additionalInfo: args,
        name: 'Comments',
        feature: Feature.Comments
      })
      dispatch(
        toast({ content: messages.updateCommentNotificationSettingError })
      )
      queryClient.resetQueries({
        queryKey: getCommentQueryKey(commentId)
      })
    }
  })
}
