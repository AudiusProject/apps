import { full, Id } from '@audius/sdk'
import {
  InfiniteData,
  useInfiniteQuery,
  useQueryClient
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { userCollectionMetadataFromSDK } from '~/adapters/collection'
import { transformAndCleanList } from '~/adapters/utils'
import { useAudiusQueryContext } from '~/audius-query'
import { ID } from '~/models/Identifiers'
import { CollectionType } from '~/store/saved-collections/types'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeCollectionData } from '../utils/primeCollectionData'

import { useCollections } from './useCollections'

const PAGE_SIZE = 20

type UseLibraryCollectionsArgs = {
  collectionType: CollectionType
  category?: full.GetUserLibraryAlbumsTypeEnum
  query?: string
  sortMethod?: full.GetUserLibraryAlbumsSortMethodEnum
  sortDirection?: full.GetUserLibraryAlbumsSortDirectionEnum
  pageSize?: number
}

export const getLibraryCollectionsQueryKey = ({
  currentUserId,
  collectionType,
  category,
  query,
  sortMethod,
  sortDirection,
  pageSize
}: UseLibraryCollectionsArgs & { currentUserId: ID | null | undefined }) =>
  [
    QUERY_KEYS.libraryCollections,
    currentUserId,
    {
      collectionType,
      category,
      query,
      sortMethod,
      sortDirection,
      pageSize
    }
  ] as unknown as QueryKey<InfiniteData<ID[]>>

export const useLibraryCollections = (
  {
    collectionType,
    category,
    query,
    sortMethod = 'added_date',
    sortDirection = 'desc',
    pageSize = PAGE_SIZE
  }: UseLibraryCollectionsArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useAudiusQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  const { data: collectionIds } = useInfiniteQuery({
    queryKey: getLibraryCollectionsQueryKey({
      currentUserId,
      collectionType,
      category,
      query,
      sortMethod,
      sortDirection,
      pageSize
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], pages: ID[][]) => {
      if (lastPage?.length < pageSize) return undefined
      return pages.length * pageSize
    },
    queryFn: async ({ pageParam = 0 }) => {
      const sdk = await audiusSdk()
      const requestParams = {
        id: Id.parse(currentUserId),
        userId: Id.parse(currentUserId),
        offset: pageParam,
        limit: pageSize,
        query,
        sortMethod,
        sortDirection,
        type: category
      }

      const { data: activities = [] } =
        collectionType === 'albums'
          ? await sdk.full.users.getUserLibraryAlbums(requestParams)
          : await sdk.full.users.getUserLibraryPlaylists(requestParams)

      const collections = transformAndCleanList(activities, ({ item }) =>
        userCollectionMetadataFromSDK(item)
      )

      primeCollectionData({
        collections,
        queryClient,
        dispatch
      })

      return collections.map((collection) => collection.playlist_id)
    },
    select: (data) => data.pages.flat(),
    staleTime: options?.staleTime ?? Infinity,
    gcTime: Infinity,
    enabled: options?.enabled !== false && !!currentUserId
  })

  return useCollections(collectionIds)
}
