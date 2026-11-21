import { QueryOptions } from '../types'

import { useSuggestedFollowsUsers } from './useSuggestedFollows'
import { useTopArtists } from './useTopArtists'

export type UseFollowSuggestionsArgs = {
  limit?: number
}

export const useFollowSuggestions = (
  { limit }: UseFollowSuggestionsArgs = {},
  options?: QueryOptions
) => {
  const { data: personalized, isPending: isPersonalizedPending } =
    useSuggestedFollowsUsers({ limit }, options)

  const hasPersonalized = !!personalized?.length

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
