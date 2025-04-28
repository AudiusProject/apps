import { Id, OptionalId } from '@audius/sdk'

import {
  transformAndCleanList,
  userCollectionMetadataFromSDK
} from '~/adapters'
import { createApi } from '~/audius-query'
import { ID, Kind } from '~/models'
import { Nullable } from '~/utils'

const playlistPermalinkToHandleAndSlug = (permalink: string) => {
  const splitPermalink = permalink.split('/')
  if (splitPermalink.length !== 4) {
    throw Error(
      'Permalink formatted incorrectly. Should follow /<handle>/playlist/<slug> format.'
    )
  }
  const [, handle, , slug] = splitPermalink
  return { handle, slug }
}

const collectionApi = createApi({
  reducerPath: 'collectionApi',
  endpoints: {
    getPlaylistsByIds: {
      fetch: async (
        { ids, currentUserId }: { ids: ID[]; currentUserId?: Nullable<ID> },
        { audiusSdk }
      ) => {
        const id = ids.filter((id) => id && id !== -1).map((id) => Id.parse(id))
        if (id.length === 0) return []

        const sdk = await audiusSdk()
        const { data = [] } = await sdk.full.playlists.getBulkPlaylists({
          id,
          userId: OptionalId.parse(currentUserId)
        })
        return transformAndCleanList(data, userCollectionMetadataFromSDK)
      },
      options: {
        idListArgKey: 'ids',
        kind: Kind.COLLECTIONS,
        schemaKey: 'collections'
      }
    },
    // Note: Please do not use this endpoint yet as it depends on further changes on the DN side.
    getPlaylistByPermalink: {
      fetch: async (
        {
          permalink,
          currentUserId
        }: { permalink: string; currentUserId: Nullable<ID> },
        { audiusSdk }
      ) => {
        const sdk = await audiusSdk()
        const { handle, slug } = playlistPermalinkToHandleAndSlug(permalink)
        const { data = [] } =
          await sdk.full.playlists.getPlaylistByHandleAndSlug({
            handle,
            slug,
            userId: OptionalId.parse(currentUserId)
          })
        return transformAndCleanList(data, userCollectionMetadataFromSDK)[0]
      },
      options: {
        permalinkArgKey: 'permalink',
        kind: Kind.COLLECTIONS,
        schemaKey: 'collection'
      }
    }
  }
})

export const { useGetPlaylistByPermalink, useGetPlaylistsByIds } =
  collectionApi.hooks
export const collectionApiReducer = collectionApi.reducer
