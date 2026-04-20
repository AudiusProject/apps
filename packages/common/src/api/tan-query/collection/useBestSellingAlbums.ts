import { HashId } from '@audius/sdk'
import { useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { entityCacheOptions } from '../utils/entityCacheOptions'

import { useCollections } from './useCollections'

type UseBestSellingAlbumsArgs = {
  limit?: number
}

export const getBestSellingAlbumsQueryKey = (
  args: UseBestSellingAlbumsArgs
) => {
  const { limit = 10 } = args
  return [QUERY_KEYS.bestSellingAlbums, { limit }] as unknown as QueryKey<ID[]>
}

export const useBestSellingAlbums = (
  args: UseBestSellingAlbumsArgs = {},
  options?: QueryOptions
) => {
  const { limit = 10 } = args
  const { audiusSdk } = useQueryContext()

  const idQuery = useQuery({
    queryKey: getBestSellingAlbumsQueryKey({ limit }),
    queryFn: async (): Promise<ID[]> => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.explore.getBestSelling({
        limit,
        type: 'album'
      })
      return data
        .map((item) => HashId.parse(item.contentId))
        .filter((id): id is ID => !!id && id > 0)
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
