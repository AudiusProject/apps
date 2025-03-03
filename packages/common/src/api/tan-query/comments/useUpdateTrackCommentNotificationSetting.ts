import { EntityManagerAction, EntityType } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { useAudiusQueryContext } from '~/audius-query'
import { Feature, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { messages } from './types'
import { getTrackCommentNotificationSettingQueryKey } from './utils'

export type UpdateTrackCommentNotificationSettingArgs = {
  userId: ID
  trackId: ID
  action: EntityManagerAction.MUTE | EntityManagerAction.UNMUTE
}

export const useUpdateTrackCommentNotificationSetting = () => {
  const { audiusSdk, reportToSentry } = useAudiusQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  return useMutation({
    mutationFn: async (args: UpdateTrackCommentNotificationSettingArgs) => {
      const { userId, trackId, action } = args
      const sdk = await audiusSdk()
      await sdk.comments.updateCommentNotificationSetting({
        userId,
        entityId: trackId,
        entityType: EntityType.TRACK,
        action
      })
    },
    onMutate: ({ trackId, action }) => {
      queryClient.setQueryData(
        getTrackCommentNotificationSettingQueryKey(trackId),
        () => ({ data: { isMuted: action === EntityManagerAction.MUTE } })
      )
    },
    onError: (error: Error, args) => {
      const { trackId } = args
      reportToSentry({
        error,
        additionalInfo: args,
        name: 'Comments',
        feature: Feature.Comments
      })
      dispatch(toast({ content: messages.muteUserError }))

      queryClient.resetQueries({
        queryKey: getTrackCommentNotificationSettingQueryKey(trackId)
      })
    }
  })
}
