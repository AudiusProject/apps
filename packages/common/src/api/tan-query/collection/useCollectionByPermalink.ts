import { OptionalId } from '@audius/sdk'
import { useQuery, useQueryClient, QueryClient } from '@tanstack/react-query'
import { pick } from 'lodash'

import { userCollectionMetadataFromSDK } from '~/adapters/collection'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

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

export const playlistPermalinkToHandleAndSlug = (permalink: string) => {
  const splitPermalink = permalink.split('/')
  if (splitPermalink.length !== 4) {
    throw Error(
      'Permalink formatted incorrectly. Should follow /<handle>/playlist/<slug> format.'
    )
  }
  const handle = splitPermalink[1]
  const slug = splitPermalink[3]
  return { handle, slug }
}

export const getCollectionByPermalinkQueryFn = async (
  permalink: string,
  currentUserId: number | null | undefined,
  queryClient: QueryClient,
  sdk: any
) => {
  const { handle, slug } = playlistPermalinkToHandleAndSlug(permalink)
  const { data = [] } = await sdk.full.playlists.getPlaylistByHandleAndSlug({
    handle,
    slug,
    userId: OptionalId.parse(currentUserId)
  })

  const collection = userCollectionMetadataFromSDK(data[0])

  if (collection) {
    // Prime related entities
    primeCollectionData({
      collections: [collection],
      queryClient
    })
  }

  return collection?.playlist_id
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
