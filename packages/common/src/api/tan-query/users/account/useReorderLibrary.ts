import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { useAppContext } from '~/context/appContext'
import { FavoriteSource, Name } from '~/models/Analytics'
import {
  PlaylistLibrary,
  PlaylistLibraryID,
  PlaylistLibraryKind,
  PlaylistLibraryItem
} from '~/models/PlaylistLibrary'
import { playlistLibraryHelpers } from '~/store/playlist-library'
import { saveCollection } from '~/store/social/collections/actions'

import { getCurrentAccountQueryKey } from './useCurrentAccount'
import { useCurrentUserId } from './useCurrentUserId'
import { usePlaylistLibrary } from './usePlaylistLibrary'
import { useUpdatePlaylistLibrary } from './useUpdatePlaylistLibrary'

type ReorderLibraryVariables = {
  collectionId: PlaylistLibraryID
  destinationId: PlaylistLibraryID
  collectionType: PlaylistLibraryKind
}

type ReorderLibraryResult = {
  previousLibrary: PlaylistLibrary
  updatedLibrary: PlaylistLibrary
  collectionId: PlaylistLibraryID
  destinationId: PlaylistLibraryID
  collectionType: PlaylistLibraryKind
}

/**
 * Hook to reorder items in the playlist library
 */
export const useReorderLibrary = () => {
  const { data: currentUserId } = useCurrentUserId()
  const { data: playlistLibrary } = usePlaylistLibrary()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { mutateAsync: updatePlaylistLibrary } = useUpdatePlaylistLibrary()
  const {
    analytics: { track, make }
  } = useAppContext()

  return useMutation<ReorderLibraryResult, Error, ReorderLibraryVariables>({
    mutationFn: async ({
      collectionId,
      destinationId,
      collectionType
    }: ReorderLibraryVariables) => {
      if (!playlistLibrary || !currentUserId) {
        throw new Error('Missing required data')
      }

      // Snapshot the pre-update library before mutating — `updatePlaylistLibrary`
      // overwrites it via setQueryData, and onSuccess needs to reason about the
      // prior state (was the playlist already in the library? in a folder?).
      const previousLibrary = playlistLibrary
      const updatedLibrary = playlistLibraryHelpers.reorderPlaylistLibrary(
        previousLibrary,
        collectionId,
        destinationId,
        collectionType
      )

      await updatePlaylistLibrary(updatedLibrary)

      return {
        previousLibrary,
        updatedLibrary,
        collectionId,
        destinationId,
        collectionType
      }
    },
    onSuccess: ({
      previousLibrary,
      updatedLibrary,
      collectionId,
      destinationId,
      collectionType
    }) => {
      queryClient.setQueryData(getCurrentAccountQueryKey(), (old) => {
        if (!old) return old
        return { ...old, playlist_library: updatedLibrary }
      })

      track(
        make({
          eventName: Name.PLAYLIST_LIBRARY_REORDER,
          containsTemporaryPlaylists: false,
          kind: collectionType
        })
      )

      if (collectionType === 'playlist' && typeof collectionId === 'number') {
        const isNewAddition = !previousLibrary.contents.some(
          (item: PlaylistLibraryItem) =>
            'playlist_id' in item && item.playlist_id === collectionId
        )
        if (isNewAddition) {
          dispatch(saveCollection(collectionId, FavoriteSource.NAVIGATOR))
        }
      }

      const isIdInFolderBeforeReorder = playlistLibraryHelpers.isInsideFolder(
        previousLibrary,
        collectionId
      )
      const isDroppingIntoFolder = playlistLibraryHelpers.isInsideFolder(
        previousLibrary,
        destinationId
      )

      if (isIdInFolderBeforeReorder && !isDroppingIntoFolder) {
        track(
          make({
            eventName: Name.PLAYLIST_LIBRARY_MOVE_PLAYLIST_OUT_OF_FOLDER,
            containsTemporaryPlaylists: false,
            kind: collectionType
          })
        )
      } else if (!isIdInFolderBeforeReorder && isDroppingIntoFolder) {
        track(
          make({
            eventName: Name.PLAYLIST_LIBRARY_MOVE_PLAYLIST_INTO_FOLDER,
            containsTemporaryPlaylists: false,
            kind: collectionType
          })
        )
      }
    }
  })
}
