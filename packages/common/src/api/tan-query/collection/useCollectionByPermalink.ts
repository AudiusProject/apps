import { Id, OptionalId } from '@audius/sdk'
import { useQuery, useQueryClient, QueryClient } from '@tanstack/react-query'
import { pick } from 'lodash'

import { userCollectionMetadataFromSDK } from '~/adapters/collection'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'
import { parsePlaylistIdFromPermalink } from '~/utils'

import { TQCollection } from '../models'
import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, QueryOptions, SelectableQueryOptions } from '../types'
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
    primeCollectionData({
      collections: [collection],
      queryClient
    })
    return collection.playlist_id
  }

  // Permalink lookup filters out hidden (is_private) playlists for
  // logged-out users, but ID-based lookup honors direct-link access.
  // Fall back to fetching by the id embedded in the permalink slug.
  const collectionId = parsePlaylistIdFromPermalink(permalink)
  if (Number.isNaN(collectionId)) return undefined

  const { data: fallbackData = [] } = await sdk.playlists.getBulkPlaylists({
    id: [Id.parse(collectionId)],
    userId
  })
  const fallbackCollection = userCollectionMetadataFromSDK(fallbackData[0])
  // Guard against id collisions with a different playlist's permalink.
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
