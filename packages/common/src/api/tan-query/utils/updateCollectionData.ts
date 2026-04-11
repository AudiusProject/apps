import { QueryClient, InfiniteData } from '@tanstack/react-query'
import { mergeWith } from 'lodash'
import { getContext } from 'typed-redux-saga'

import { ID, Collection } from '~/models'
import { mergeCustomizer } from '~/store/cache/mergeCustomizer'

import { getCollectionQueryKey } from '../collection/useCollection'
import { QUERY_KEYS } from '../queryKeys'

import { primeCollectionData } from './primeCollectionData'

type PartialCollectionUpdate = Partial<Collection> & { playlist_id: ID }

export const updateCollectionData = function* (
  partialCollections: PartialCollectionUpdate[]
) {
  const queryClient = yield* getContext<QueryClient>('queryClient')

  // Get existing collection data and merge with updates
  const collectionsToUpdate = partialCollections.map((partialCollection) => {
    const { playlist_id } = partialCollection
    const existingCollection = queryClient.getQueryData(
      getCollectionQueryKey(playlist_id)
    ) as Collection | undefined

    if (existingCollection) {
      return mergeWith(
        {},
        existingCollection,
        partialCollection,
        mergeCustomizer
      )
    }
    return partialCollection as Collection
  })

  // Use primeCollectionData with forceReplace to ensure updates are saved
  primeCollectionData({
    collections: collectionsToUpdate,
    queryClient,
    forceReplace: true
  })
}

/**
 * Optimistically adds a newly created collection ID to the user's
 * albums or playlists infinite query so it appears immediately in the profile.
 */
export const addCollectionToUserList = function* (
  userId: ID,
  collectionId: ID,
  isAlbum: boolean
) {
  const queryClient = yield* getContext<QueryClient>('queryClient')
  const queryKey = [
    isAlbum ? QUERY_KEYS.userAlbums : QUERY_KEYS.userPlaylists,
    userId
  ]

  // Find all matching infinite queries for this user and prepend the new ID
  queryClient.setQueriesData<InfiniteData<ID[]>>(
    { queryKey },
    (oldData) => {
      if (!oldData) return oldData
      const firstPage = oldData.pages[0] ?? []
      // Don't add if already present
      if (firstPage.includes(collectionId)) return oldData
      return {
        ...oldData,
        pages: [[collectionId, ...firstPage], ...oldData.pages.slice(1)]
      }
    }
  )
}
