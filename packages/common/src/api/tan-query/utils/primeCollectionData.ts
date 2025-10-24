import { QueryClient } from '@tanstack/react-query'
import { omit } from 'lodash'
import { getContext } from 'typed-redux-saga'

import { Kind } from '~/models'
import { CollectionMetadata, UserCollectionMetadata } from '~/models/Collection'
import { Uid } from '~/utils'

import { getCollectionQueryKey } from '../collection/useCollection'
import { getCollectionByPermalinkQueryKey } from '../collection/useCollectionByPermalink'
import { TQCollection } from '../models'

import { primeTrackDataInternal } from './primeTrackData'
import { primeUserData } from './primeUserData'

export const primeCollectionData = ({
  collections,
  queryClient,
  forceReplace = false,
  skipQueryData = false
}: {
  collections: (UserCollectionMetadata | CollectionMetadata)[]
  queryClient: QueryClient
  forceReplace?: boolean
  skipQueryData?: boolean
}): TQCollection[] => {
  return collections.map((collection) => {
    const tqCollection = {
      ...omit(collection, ['tracks', 'user']),
      trackIds:
        collection.playlist_contents?.track_ids?.map((t) => t.track) ?? [],
      playlist_contents: {
        track_ids: collection.playlist_contents.track_ids.map((t) => ({
          ...t,
          uid: t.uid ?? new Uid(Kind.TRACKS, t.track, 'collection').toString()
        }))
      }
    } as TQCollection
    // Prime collection data only if it doesn't exist and skipQueryData is false
    if (
      forceReplace ||
      (!skipQueryData &&
        !queryClient.getQueryData(
          getCollectionQueryKey(collection.playlist_id)
        ))
    ) {
      queryClient.setQueryData(
        getCollectionQueryKey(collection.playlist_id),
        tqCollection
      )
    }

    if (
      forceReplace ||
      !queryClient.getQueryData(
        getCollectionByPermalinkQueryKey(collection.permalink)
      )
    ) {
      queryClient.setQueryData(
        getCollectionByPermalinkQueryKey(collection.permalink),
        collection.playlist_id
      )
    }

    // Prime user data from collection owner
    if ('user' in collection) {
      primeUserData({
        users: [collection.user],
        queryClient
      })
    }

    // Prime track and user data from tracks in collection
    if (collection.tracks?.length) {
      primeTrackDataInternal({
        tracks: collection.tracks,
        queryClient,
        forceReplace
      })
    }
    return tqCollection
  })
}

export function* primeCollectionDataSaga(
  collections: (UserCollectionMetadata | CollectionMetadata)[]
) {
  const queryClient = (yield* getContext('queryClient')) as QueryClient

  return primeCollectionData({ collections, queryClient })
}
