import {
  OptionalHashId,
  type PlaylistLibrary as SdkPlaylistLibrary,
  type PlaylistUpdate as SdkPlaylistUpdate
} from '@audius/sdk/services'

import {
  PlaylistLibrary,
  PlaylistLibraryFolder,
  PlaylistLibraryIdentifier,
  PlaylistLibraryItem,
  PlaylistUpdate
} from '~/models/PlaylistLibrary'

import { transformAndCleanList } from './utils'

const playlistIdentifierFromSDK = (
  input: any
): PlaylistLibraryIdentifier | null => {
  // Regular playlists need the id decoded. All others can pass through
  // as they are.
  if (input.type === 'playlist') {
    const playlist_id = OptionalHashId.parse(input.playlist_id)
    return playlist_id ? { type: 'playlist', playlist_id } : null
  }
  return input
}

const playlistFolderFromSDK = (input: any): PlaylistLibraryFolder => {
  return {
    ...input,
    contents: transformAndCleanList(input.contents, (item: any) => {
      return item.type === 'folder'
        ? playlistFolderFromSDK(item)
        : playlistIdentifierFromSDK(item)
    })
  }
}

const playlistItemFromSDK = (input: any): PlaylistLibraryItem | null => {
  return input.type === 'folder'
    ? playlistFolderFromSDK(input)
    : playlistIdentifierFromSDK(input)
}

export const playlistLibraryFromSDK = (
  input?: SdkPlaylistLibrary
): PlaylistLibrary | undefined => {
  if (!input) return undefined
  return {
    contents: transformAndCleanList(input.contents, playlistItemFromSDK)
  }
}

export const playlistUpdateFromSDK = (
  input: SdkPlaylistUpdate
): PlaylistUpdate | undefined => {
  const playlist_id = OptionalHashId.parse(input.playlistId)
  return playlist_id
    ? {
        playlist_id,
        updated_at: input.updatedAt,
        last_seen_at: input.lastSeenAt ?? null
      }
    : undefined
}
