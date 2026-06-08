import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ID } from '~/models/Identifiers'
import { PlaylistUpdate } from '~/models/PlaylistLibrary'

import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useQueryContext } from '../utils'

import { getPlaylistUpdatesQueryKey } from './usePlaylistUpdates'

type MutationContext = {
  previous: PlaylistUpdate[] | undefined
}

/**
 * Marks a playlist as viewed by the current user. Optimistically removes the
 * playlist from the local "has updates" cache so the badge clears immediately.
 *
 * Replaces the legacy `updatedPlaylistViewed` redux action + the
 * `watchUpdatedPlaylistViewedSaga` SDK call.
 */
export const useMarkPlaylistAsViewed = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  return useMutation({
    mutationFn: async ({ playlistId }: { playlistId: ID }) => {
      if (!currentUserId) return
      const sdk = await audiusSdk()
      await sdk.notifications.updatePlaylistLastViewedAt({
        playlistId: Id.parse(playlistId),
        userId: Id.parse(currentUserId)
      })
    },
    onMutate: async ({ playlistId }): Promise<MutationContext> => {
      const queryKey = getPlaylistUpdatesQueryKey(currentUserId)
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(
        queryKey,
        (old) => old?.filter((u) => u.playlist_id !== playlistId) ?? []
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          getPlaylistUpdatesQueryKey(currentUserId),
          context.previous
        )
      }
    }
  })
}
