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
    primeUserData({
      users: transformAndCleanList(users, userMetadataFromSDK),
      queryClient,
      forceReplace,
      skipQueryData
    })
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
