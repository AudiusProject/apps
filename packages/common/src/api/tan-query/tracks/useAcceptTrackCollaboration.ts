import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { useCurrentUserId } from '../users/account/useCurrentUserId'

import { getTrackQueryKey } from './useTrack'

type AcceptTrackCollaborationArgs = {
  trackId: ID
}

export const useAcceptTrackCollaboration = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  return useMutation({
    mutationFn: async ({ trackId }: AcceptTrackCollaborationArgs) => {
      if (!currentUserId) throw new Error('User ID is required')
      const sdk = await audiusSdk()
      await sdk.tracks.acceptTrackCollaboration({
        userId: Id.parse(currentUserId),
        trackId: Id.parse(trackId)
      })
      return { trackId }
    },
    onSuccess: ({ trackId }) => {
      queryClient.invalidateQueries({ queryKey: getTrackQueryKey(trackId) })
    }
  })
}
