import { OptionalId } from '@audius/sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { userCollectionMetadataFromSDK } from '~/adapters/collection'
import { transformAndCleanList } from '~/adapters/utils'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { entityCacheOptions } from '../utils/entityCacheOptions'
import { primeCollectionData } from '../utils/primeCollectionData'

import { useCollections } from './useCollections'

type UseTrendingAlbumsArgs = {
  time?: 'week' | 'month' | 'year' | 'allTime'
  limit?: number
}

export const getTrendingAlbumsQueryKey = (args: UseTrendingAlbumsArgs) => {
  const { time = 'month', limit = 10 } = args
  return [QUERY_KEYS.trendingAlbums, { time, limit }] as unknown as QueryKey<
    ID[]
  >
}

export const useTrendingAlbums = (
  args: UseTrendingAlbumsArgs = {},
  options?: QueryOptions
) => {
  const { time = 'month', limit = 10 } = args
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  const idQuery = useQuery({
    queryKey: getTrendingAlbumsQueryKey({ time, limit }),
    queryFn: async (): Promise<ID[]> => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.playlists.getTrendingPlaylists({
        time,
        limit,
        type: 'album',
        userId: OptionalId.parse(currentUserId)
      })
      const collections = transformAndCleanList(
        data,
        userCollectionMetadataFromSDK
      )
      primeCollectionData({ collections, queryClient })
      return collections.map((c) => c.playlist_id)
    },
    ...options,
    ...entityCacheOptions,
    enabled: options?.enabled !== false
  })

  const {
    data: collections,
    isPending: isCollectionsPending,
    isLoading: isCollectionsLoading
  } = useCollections(idQuery.data)

  const hasPendingCollections =
    (idQuery.data?.length ?? 0) > 0 && isCollectionsPending

  return {
    data: collections,
    ids: idQuery.data,
    isPending: idQuery.isPending || hasPendingCollections,
    isLoading:
      idQuery.isLoading || (hasPendingCollections && isCollectionsLoading),
    isError: idQuery.isError,
    isSuccess: idQuery.isSuccess
  }
}
