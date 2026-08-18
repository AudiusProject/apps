import { QueryOptions } from '../types'

import { useSuggestedFollowsUsers } from './useSuggestedFollows'
import { useTopArtists } from './useTopArtists'

export type UseFollowSuggestionsArgs = {
  limit?: number
}

/**
 * Artists to suggest the user follow on empty-feed / "find artists" surfaces.
 *
 * Prefers suggestions personalized from the user's own favorites and reposts,
 * and falls back to the curated featured list when there aren't any — which is
 * the common case for a brand new account, and the only case for a signed-out
 * one. Both surfaces that show follow suggestions share this so the fallback
 * rule lives in one place.
 */
export const useFollowSuggestions = (
  { limit }: UseFollowSuggestionsArgs = {},
  options?: QueryOptions
) => {
  const { data: personalized, isPending: isPersonalizedPending } =
    useSuggestedFollowsUsers({ limit }, options)

  const hasPersonalized = !!personalized?.length

  // Fetched unconditionally rather than gated on personalization coming back
  // empty: the empty case is exactly the new-account case this surface exists
  // for, and gating would put a serial request in front of it. The fallback is
  // a small static list, so fetching it and discarding it costs ~nothing.
  const { data: featured, isPending: isFeaturedPending } = useTopArtists(
    'Featured',
    options
  )

  if (isPersonalizedPending) {
    return { data: undefined, isPending: true, isPersonalized: false }
  }

  if (hasPersonalized) {
    return { data: personalized, isPending: false, isPersonalized: true }
  }

  return {
    data: featured,
    isPending: isFeaturedPending,
    isPersonalized: false
  }
}
