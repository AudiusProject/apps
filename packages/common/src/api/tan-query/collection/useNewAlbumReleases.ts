import { useQuery, useQueryClient } from '@tanstack/react-query'

import { userCollectionMetadataFromSDK } from '~/adapters/collection'
import { transformAndCleanList } from '~/adapters/utils'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { entityCacheOptions } from '../utils/entityCacheOptions'
import { primeCollectionData } from '../utils/primeCollectionData'

import { useCollections } from './useCollections'

type UseNewAlbumReleasesArgs = {
  limit?: number
}

export const getNewAlbumReleasesQueryKey = (args: UseNewAlbumReleasesArgs) => {
  const { limit = 10 } = args
  return [QUERY_KEYS.newReleaseAlbums, { limit }] as unknown as QueryKey<ID[]>
}

export const useNewAlbumReleases = (
  args: UseNewAlbumReleasesArgs = {},
  options?: QueryOptions
) => {
  const { limit = 10 } = args
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  const idQuery = useQuery({
    queryKey: getNewAlbumReleasesQueryKey({ limit }),
    queryFn: async (): Promise<ID[]> => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.playlists.getPlaylistsNewReleases({
        limit,
        type: 'album'
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
