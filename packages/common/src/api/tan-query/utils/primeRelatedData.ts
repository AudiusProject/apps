import type { Related } from '@audius/sdk'
import { QueryClient } from '@tanstack/react-query'

import {
  transformAndCleanList,
  userCollectionMetadataFromSDK,
  userTrackMetadataFromSDK,
  userMetadataFromSDK
} from '~/adapters'

import { primeCollectionData } from './primeCollectionData'
import { primeTrackData } from './primeTrackData'
import { primeUserData } from './primeUserData'

/**
 * Utility function to prime related data from API responses
 * This handles users, tracks, and playlists that may be included in the
 * related field.
 */
export const primeRelatedData = ({
  related,
  queryClient,
  forceReplace = false,
  skipQueryData = false
}: {
  related: Related | undefined
  queryClient: QueryClient
  forceReplace?: boolean
  skipQueryData?: boolean
}) => {
  if (!related) return

  const { users, tracks, playlists } = related

  if (users && users.length > 0) {
    // `related` users are hydrated server-side. When the server omits the
    // requester's perspective (`does_current_user_follow` and other
    // current-user fields), priming would shadow any later authoritative
    // fetch — `useUser` / `useUserByHandle` use `staleTime: Infinity` and
    // `primeUserData` skips overwriting an existing cache entry, so the
    // partial prime would persist and the profile page would render stale
    // follow state. Skip the prime in that case and let `useUser`'s
    // batcher fetch fresh data with `currentUserId`.
    // (The TS type claims `does_current_user_follow: boolean`, but the
    // SDK leaves it `undefined` when the server omits the key.)
    const primedUsers = transformAndCleanList(
      users,
      userMetadataFromSDK
    ).filter(
      (user) =>
        (user as { does_current_user_follow?: boolean })
          .does_current_user_follow !== undefined
    )
    if (primedUsers.length > 0) {
      primeUserData({
        users: primedUsers,
        queryClient,
        forceReplace,
        skipQueryData
      })
    }
  }

  if (tracks && tracks.length > 0) {
    primeTrackData({
      tracks: transformAndCleanList(tracks, userTrackMetadataFromSDK),
      queryClient,
      forceReplace,
      skipQueryData
    })
  }

  if (playlists && playlists.length > 0) {
    primeCollectionData({
      collections: transformAndCleanList(
        playlists,
        userCollectionMetadataFromSDK
      ),
      queryClient,
      forceReplace,
      skipQueryData
    })
  }
}
