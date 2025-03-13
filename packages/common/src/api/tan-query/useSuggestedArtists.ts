import { useQuery } from '@tanstack/react-query'

import { useAudiusQueryContext } from '~/audius-query'

import { QUERY_KEYS } from './queryKeys'
import { QueryOptions } from './types'
import { useUsers } from './useUsers'

export const getSuggestedArtistsQueryKey = () => [QUERY_KEYS.suggestedArtists]

export const useSuggestedArtists = (
  options?: Omit<QueryOptions<any>, 'select'>
) => {
  const { env, fetch } = useAudiusQueryContext()

  const { data: suggestedIds } = useQuery<number[]>({
    queryKey: getSuggestedArtistsQueryKey(),
    queryFn: async () => {
      const response = await fetch(env.SUGGESTED_FOLLOW_HANDLES!)
      const suggestedArtists = await response.json()
      // dedupe the artists just in case the team accidentally adds the same artist twice
      return [...new Set(suggestedArtists as number[])]
    },
    ...options,
    enabled: options?.enabled !== false
  })

  return useUsers(suggestedIds, {
    ...options,
    enabled: options?.enabled !== false
  })
}
