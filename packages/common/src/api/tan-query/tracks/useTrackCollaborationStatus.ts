import { Id } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { userMetadataListFromSDK } from '~/adapters/user'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'

export const getTrackCollaborationStatusQueryKey = (
  trackId: ID | null | undefined,
  userId: ID | null | undefined
) => [QUERY_KEYS.trackCollaborationStatus, trackId, userId]

export const useTrackCollaborationStatus = (
  trackId: ID | null | undefined,
  userId: ID | null | undefined
) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getTrackCollaborationStatusQueryKey(trackId, userId),
    queryFn: async () => {
      if (!trackId || !userId) return false

      const sdk = await audiusSdk()
      const { data } = await sdk.tracks.getBulkTracks({
        id: [Id.parse(trackId)],
        userId: Id.parse(userId)
      })
      const track = data?.[0]
      const collaborators = userMetadataListFromSDK(track?.collaborators)
      return collaborators.some(
        (collaborator) => collaborator.user_id === userId
      )
    },
    enabled: !!trackId && !!userId
  })
}
