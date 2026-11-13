import { Id } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import {
  getTrackCollaboratorsForEdit,
  userTrackMetadataFromSDK
} from '~/adapters/track'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

export const getTrackCollaboratorsForEditQueryKey = (
  trackId: ID | null | undefined,
  userId: ID | null | undefined
) => [QUERY_KEYS.trackCollaboratorsForEdit, trackId, userId]

/**
 * Accepted and pending collaborators of a track, fetched as its owner.
 * Pending invites only come back on a request made by the owner, so the cached
 * track can be missing them. An edit seeded from that would delete the invites.
 */
export const useTrackCollaboratorsForEdit = (
  trackId: ID | null | undefined
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  return useQuery({
    queryKey: getTrackCollaboratorsForEditQueryKey(trackId, currentUserId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data } = await sdk.tracks.getBulkTracks({
        id: [Id.parse(trackId!)],
        userId: Id.parse(currentUserId!)
      })
      const track = data?.[0] ? userTrackMetadataFromSDK(data[0]) : undefined
      if (!track) throw new Error('Track not found')
      return {
        collaborators: getTrackCollaboratorsForEdit(track),
        acceptedUserIds: (track.collaborators ?? []).map(
          (collaborator) => collaborator.user_id
        )
      }
    },
    enabled: !!trackId && !!currentUserId,
    staleTime: 0,
    gcTime: 0
  })
}
