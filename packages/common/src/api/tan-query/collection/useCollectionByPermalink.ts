import { Id, OptionalId } from '@audius/sdk'
import {
  useQuery,
  useQueryClient,
  type QueryClient
} from '@tanstack/react-query'
import { pick } from 'lodash'

import { userCollectionMetadataFromSDK } from '~/adapters/collection'
import { useQueryContext } from '~/api/tan-query/utils/QueryContext'
import type { ID } from '~/models/Identifiers'
import { parsePlaylistIdFromPermalink } from '~/utils/stringUtils'

import type { TQCollection } from '../models'
import { QUERY_KEYS } from '../queryKeys'
import type { QueryKey, QueryOptions, SelectableQueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { entityCacheOptions } from '../utils/entityCacheOptions'
import { primeCollectionData } from '../utils/primeCollectionData'

import { useCollection } from './useCollection'

export const getCollectionByPermalinkQueryKey = (
  permalink: string | undefined | null
) => {
  return [
    QUERY_KEYS.collectionByPermalink,
    permalink
  ] as unknown as QueryKey<ID>
}

export const getCollectionByPermalinkQueryFn = async (
  permalink: string,
  currentUserId: number | null | undefined,
  queryClient: QueryClient,
  sdk: any
) => {
  const userId = OptionalId.parse(currentUserId)
  const { data = [] } = await sdk.playlists.getBulkPlaylists({
    permalink: [permalink],
    userId
  })

  const collection = userCollectionMetadataFromSDK(data[0])

  if (collection) {
    // Prime related entities
    primeCollectionData({
      collections: [collection],
      queryClient
    })

    return collection.playlist_id
  }

  const collectionId = parsePlaylistIdFromPermalink(permalink)
  if (Number.isNaN(collectionId)) return undefined

  const { data: fallbackData = [] } = await sdk.playlists.getBulkPlaylists({
    id: [Id.parse(collectionId)],
    userId
  })
  const fallbackCollection = userCollectionMetadataFromSDK(fallbackData[0])
  if (fallbackCollection?.permalink !== permalink) return undefined

  primeCollectionData({
    collections: [fallbackCollection],
    queryClient
  })

  return fallbackCollection.playlist_id
}

export const useCollectionByPermalink = <TResult = TQCollection>(
  permalink: string | undefined | null,
  options?: SelectableQueryOptions<TQCollection, TResult>
) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  const simpleOptions = pick(options, [
    'enabled',
    'staleTime',
    'placeholderData'
  ]) as QueryOptions

  const { data: collectionId } = useQuery<number | undefined>({
    queryKey: getCollectionByPermalinkQueryKey(permalink),
    queryFn: async () => {
      const sdk = await audiusSdk()
      return getCollectionByPermalinkQueryFn(
        permalink!,
        currentUserId,
        queryClient,
        sdk
      )
    },
    ...entityCacheOptions,
    ...simpleOptions,
    enabled: simpleOptions?.enabled !== false && !!permalink
  })

  return useCollection(collectionId, options)
}
