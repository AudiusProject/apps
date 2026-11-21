import { QueryClient } from '@tanstack/react-query'
import { mergeWith } from 'lodash'
import { getContext } from 'typed-redux-saga'

import { ID, Collection } from '~/models'
import { mergeCustomizer } from '~/store/cache/mergeCustomizer'

import { getCollectionQueryKey } from '../collection/useCollection'

import { primeCollectionData } from './primeCollectionData'

type PartialCollectionUpdate = Partial<Collection> & { playlist_id: ID }

export const updateCollectionData = function* (
  partialCollections: PartialCollectionUpdate[]
) {
  const queryClient = yield* getContext<QueryClient>('queryClient')

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

  primeCollectionData({
    collections: collectionsToUpdate,
    queryClient,
    forceReplace: true
  })
}
