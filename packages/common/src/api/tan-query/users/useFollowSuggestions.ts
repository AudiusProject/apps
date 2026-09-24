import { QueryOptions } from '../types'

import { useSuggestedFollowsUsers } from './useSuggestedFollows'
import { useTopArtists } from './useTopArtists'

export type UseFollowSuggestionsArgs = {
  limit?: number
}

/**
 * Follow suggestions for empty-feed surfaces: personalized suggestions when
 * available, otherwise the featured artists list.
 */
export const useFollowSuggestions = (
  { limit }: UseFollowSuggestionsArgs = {},
  options?: QueryOptions
) => {
  const { data: personalized, isPending: isPersonalizedPending } =
    useSuggestedFollowsUsers({ limit }, options)

  const hasPersonalized = !!personalized?.length

  // Fetch in parallel so new accounts (no personalized results) don't wait on
  // two serial requests.
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
