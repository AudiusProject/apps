import type { SearchModel } from '@audius/sdk'
import { type QueryClient } from '@tanstack/react-query'

import { primeCollectionData } from '~/api/tan-query/utils/primeCollectionData'
import { primeTrackData } from '~/api/tan-query/utils/primeTrackData'
import { primeUserData } from '~/api/tan-query/utils/primeUserData'
import {
  UserTrackMetadata,
  UserCollectionMetadata,
  UserMetadata
} from '~/models'

import { userCollectionMetadataFromSDK } from './collection'
import { userTrackMetadataFromSDK } from './track'
import { userMetadataFromSDK } from './user'
import { transformAndCleanList } from './utils'

export type SearchResults = {
  tracks: UserTrackMetadata[]
  saved_tracks: UserTrackMetadata[]
  users: UserMetadata[]
  followed_users: UserMetadata[]
  playlists: UserCollectionMetadata[]
  saved_playlists: UserCollectionMetadata[]
  albums: UserCollectionMetadata[]
  saved_albums: UserCollectionMetadata[]
}

export const searchResultsFromSDK = (
  input?: SearchModel,
  queryClient?: QueryClient
): SearchResults => {
  if (!input) {
    return {
      users: [],
      followed_users: [],
      tracks: [],
      saved_tracks: [],
      playlists: [],
      saved_playlists: [],
      saved_albums: [],
      albums: []
    }
  }

  const tracks = transformAndCleanList(input.tracks, userTrackMetadataFromSDK)
  const saved_tracks = transformAndCleanList(
    input.savedTracks,
    userTrackMetadataFromSDK
  )

  const users = transformAndCleanList(input.users, userMetadataFromSDK)
  const followed_users = transformAndCleanList(
    input.followedUsers,
    userMetadataFromSDK
  )

  const playlists = transformAndCleanList(
    input.playlists,
    userCollectionMetadataFromSDK
  )
  const saved_playlists = transformAndCleanList(
    input.savedPlaylists ?? [],
    userCollectionMetadataFromSDK
  )

  const albums = transformAndCleanList(
    input.albums,
    userCollectionMetadataFromSDK
  )
  const saved_albums = transformAndCleanList(
    input.savedAlbums,
    userCollectionMetadataFromSDK
  )

  if (queryClient) {
    primeTrackData({ tracks, queryClient })
    primeTrackData({ tracks: saved_tracks, queryClient })
    primeUserData({ users, queryClient })
    primeUserData({ users: followed_users, queryClient })
    primeCollectionData({ collections: playlists, queryClient })
    primeCollectionData({ collections: saved_playlists, queryClient })
    primeCollectionData({ collections: albums, queryClient })
    primeCollectionData({ collections: saved_albums, queryClient })
  }

  return {
    tracks,
    saved_tracks,
    users,
    followed_users,
    playlists,
    saved_playlists,
    albums,
    saved_albums
  }
}

export const AUTOCOMPLETE_TOTAL_RESULTS = 3

export const limitAutocompleteResults = (
  results: SearchResults,
  maxResults: number = AUTOCOMPLETE_TOTAL_RESULTS
): SearchResults => {
  return Object.keys(results).reduce((acc, key) => {
    acc[key] = results[key].slice(0, Math.min(maxResults, results[key].length))
    return acc
  }, {} as SearchResults)
}
