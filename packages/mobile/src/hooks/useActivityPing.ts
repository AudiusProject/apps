import { useCallback } from 'react'

import { useCurrentUserId, useQueryContext } from '@audius/common/api'

import { useEnterForeground } from 'app/hooks/useAppState'
import { audiusBackendInstance } from 'app/services/audius-backend-instance'

export const useActivityPing = () => {
  const { data: currentUserId } = useCurrentUserId()
  const { audiusSdk } = useQueryContext()

  useEnterForeground(
    useCallback(async () => {
      if (!currentUserId) return
      try {
        const sdk = await audiusSdk()
        await audiusBackendInstance.pingActivity({
          sdk,
          userId: currentUserId
        })
      } catch {
        // Fire-and-forget
      }
    }, [currentUserId, audiusSdk])
  )
}
