import { Id } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { transformAndCleanList } from '~/adapters'
import { favoriteFromSDK } from '~/adapters/favorite'
import { useQueryContext } from '~/api/tan-query/utils'
import { Favorite } from '~/models/Favorite'
import { ID } from '~/models/Identifiers'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'

export const getFavoritedTracksQueryKey = (userId: ID | null | undefined) => {
  return [QUERY_KEYS.favoritedTracks, userId] as unknown as QueryKey<Favorite[]>
}

export const useFavoritedTracks = (
  userId: ID | null | undefined,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getFavoritedTracksQueryKey(userId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data } = await sdk.users.getUserFavorites({
        id: Id.parse(userId)
      })

      return transformAndCleanList(data, favoriteFromSDK)
    },
    ...options,
    enabled: options?.enabled !== false && !!userId
  })
}
