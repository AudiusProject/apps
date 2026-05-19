import { useCallback } from 'react'

import { Id } from '@audius/sdk'

import { useCurrentUserId } from '~/api/tan-query/users/account/useCurrentUserId'
import { useQueryContext } from '~/api/tan-query/utils/QueryContext'

/** Sends an EntityManager share action. Fire and forget. Logs to console if it fails. */
export const useShareAction = () => {
  const { audiusSdk } = useQueryContext()
  const { data: userId } = useCurrentUserId()

  return useCallback(
    async (entityId: number, entityType: 'playlist' | 'track') => {
      if (
        !userId ||
        !entityId ||
        entityId <= 0 ||
        !['playlist', 'track'].includes(entityType)
      )
        return

      try {
        const sdk = await audiusSdk()
        if (entityType === 'track') {
          sdk.tracks.shareTrack({
            userId: Id.parse(userId),
            trackId: Id.parse(entityId)
          })
        } else if (entityType === 'playlist') {
          sdk.playlists.sharePlaylist({
            userId: Id.parse(userId),
            playlistId: Id.parse(entityId)
          })
        }
      } catch (error) {
        console.error(
          'Failed to send EntityManager share action',
          error as Error
        )
      }
    },
    [audiusSdk, userId]
  )
}
