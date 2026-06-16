import { useCallback, useEffect, useRef } from 'react'

import { useCurrentUserId, useQueryContext } from '@audius/common/api'

import { audiusBackendInstance } from 'services/audius-backend/audius-backend-instance'

const PING_DEBOUNCE_MS = 5 * 60 * 1000

export const useActivityPing = () => {
  const { data: currentUserId } = useCurrentUserId()
  const { audiusSdk } = useQueryContext()
  const lastPingRef = useRef(0)

  const pingActivity = useCallback(async () => {
    if (!currentUserId) return
    const now = Date.now()
    if (now - lastPingRef.current < PING_DEBOUNCE_MS) return
    lastPingRef.current = now
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

  // Ping on initial page load
  useEffect(() => {
    pingActivity()
  }, [pingActivity])

  // Ping when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        pingActivity()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [pingActivity])
}
