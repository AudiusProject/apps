import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAppContext } from '~/context'
import { ID } from '~/models/Identifiers'
import {
  getAcceptedTrackCollaborationStorageKey,
  isAcceptedTrackCollaborationStorageValue
} from '~/utils/trackCollaboration'

export const useAcceptedTrackCollaborationInvite = (
  userId: ID | null | undefined,
  trackId: ID | null | undefined
) => {
  const { localStorage } = useAppContext()
  const storageKey = useMemo(
    () =>
      userId && trackId
        ? getAcceptedTrackCollaborationStorageKey(userId, trackId)
        : null,
    [trackId, userId]
  )
  const [isMarkedAccepted, setIsMarkedAccepted] = useState(() =>
    storageKey
      ? isAcceptedTrackCollaborationStorageValue(
          localStorage.getItemSync(storageKey)
        )
      : false
  )

  useEffect(() => {
    let isActive = true

    if (!storageKey) {
      setIsMarkedAccepted(false)
      return
    }

    const readAccepted = async () => {
      const value = await localStorage.getItem(storageKey)
      if (isActive) {
        setIsMarkedAccepted(isAcceptedTrackCollaborationStorageValue(value))
      }
    }

    readAccepted()

    return () => {
      isActive = false
    }
  }, [localStorage, storageKey])

  const markAccepted = useCallback(() => {
    if (!storageKey) return

    setIsMarkedAccepted(true)
    localStorage.setItem(storageKey, 'true')
  }, [localStorage, storageKey])

  return { isMarkedAccepted, markAccepted }
}
