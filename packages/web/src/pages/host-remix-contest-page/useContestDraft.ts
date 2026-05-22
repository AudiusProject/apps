import { useCallback, useState } from 'react'

import { ID } from '@audius/common/models'

export type ContestDraft = {
  title?: string
  description?: string
  videoUrl?: string
  coverPhotoUrl?: string
  prizeInfo?: string
  contestEndDate?: string
  timeValue?: string
  meridianValue?: string
  sourceTrackIds?: number[]
  savedAt: string
}

const STORAGE_PREFIX = 'audius:contest-draft'

const draftKey = (userId: ID | null | undefined, primaryTrackId?: ID) => {
  if (!userId) return null
  const scope = primaryTrackId ? String(primaryTrackId) : 'trackless'
  return `${STORAGE_PREFIX}:${userId}:${scope}`
}

const readDraft = (key: string | null): ContestDraft | null => {
  if (!key || typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'savedAt' in parsed) {
      return parsed as ContestDraft
    }
    return null
  } catch {
    return null
  }
}

/**
 * Persists in-progress Create Contest form state to localStorage so users
 * can come back later without re-entering everything. Drafts are scoped
 * per user and per primary track (or "trackless" for the
 * /host-contest route).
 *
 * Drafts are only relevant for the create flow — edit mode is driven by
 * the live event and skipped entirely.
 */
export const useContestDraft = ({
  userId,
  primaryTrackId,
  enabled
}: {
  userId: ID | null | undefined
  primaryTrackId?: ID
  enabled: boolean
}) => {
  const key = enabled ? draftKey(userId, primaryTrackId) : null

  // Snapshot at mount — the page's form state is initialized from this,
  // so it's only the *existing* draft that matters here. Subsequent saves
  // shouldn't re-trigger the restore banner.
  const [existingDraft] = useState<ContestDraft | null>(() => readDraft(key))

  const saveDraft = useCallback(
    (draft: Omit<ContestDraft, 'savedAt'>) => {
      if (!key) return
      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({ ...draft, savedAt: new Date().toISOString() })
        )
      } catch {
        // Quota or private-mode failures shouldn't break submit.
      }
    },
    [key]
  )

  const clearDraft = useCallback(() => {
    if (!key) return
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }, [key])

  return {
    existingDraft,
    saveDraft,
    clearDraft
  }
}
