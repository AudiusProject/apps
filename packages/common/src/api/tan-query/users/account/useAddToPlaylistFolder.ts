import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { useAppContext } from '~/context/appContext'
import { FavoriteSource, Name } from '~/models/Analytics'
import {
  PlaylistLibrary,
  PlaylistLibraryID,
  PlaylistLibraryFolder
} from '~/models/PlaylistLibrary'
import { playlistLibraryHelpers } from '~/store/playlist-library'
import { saveCollection } from '~/store/social/collections/actions'
import { toast } from '~/store/ui/toast/slice'

import { getCurrentAccountQueryKey } from './useCurrentAccount'
import { useCurrentUserId } from './useCurrentUserId'
import { usePlaylistLibrary } from './usePlaylistLibrary'
import { useUpdatePlaylistLibrary } from './useUpdatePlaylistLibrary'

type AddToFolderVariables = {
  entityId: PlaylistLibraryID
  folder: PlaylistLibraryFolder
}

type AddToFolderResult = {
  previousLibrary: PlaylistLibrary
  updatedLibrary: PlaylistLibrary
  entityId: PlaylistLibraryID
  folder: PlaylistLibraryFolder
}

const messages = {
  playlistMovedToFolderToast: (folderName: string) =>
    `This playlist was already in your library. It has now been moved to ${folderName}!`
}

/**
 * Hook to add items to a playlist folder
 */
export const useAddToPlaylistFolder = () => {
  const { data: currentUserId } = useCurrentUserId()
  const { data: playlistLibrary } = usePlaylistLibrary()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const updatePlaylistLibrary = useUpdatePlaylistLibrary()
  const {
    analytics: { track, make }
  } = useAppContext()

  return useMutation<AddToFolderResult, Error, AddToFolderVariables>({
    mutationFn: async ({ entityId, folder }: AddToFolderVariables) => {
      if (!playlistLibrary || !currentUserId) {
        throw new Error('Missing required data')
      }

      // Snapshot before mutating — updatePlaylistLibrary overwrites the cache.
      const previousLibrary = playlistLibrary
      const updatedLibrary = playlistLibraryHelpers.addPlaylistToFolder(
        previousLibrary,
        entityId,
        folder.id
      )

      await updatePlaylistLibrary.mutateAsync(updatedLibrary)

      return {
        previousLibrary,
        updatedLibrary,
        entityId,
        folder
      }
    },
    onSuccess: ({ previousLibrary, updatedLibrary, entityId, folder }) => {
      queryClient.setQueryData(getCurrentAccountQueryKey(), (old) => {
        if (!old) return old
        return { ...old, playlist_library: updatedLibrary }
      })

      if (typeof entityId === 'number') {
        const isNewAddition = !previousLibrary.contents.some(
          (item) => 'playlist_id' in item && item.playlist_id === entityId
        )
        if (isNewAddition) {
          dispatch(saveCollection(entityId, FavoriteSource.NAVIGATOR))
        }
      }

      if (
        playlistLibraryHelpers.findInPlaylistLibrary(previousLibrary, entityId)
      ) {
        dispatch(
          toast({
            content: messages.playlistMovedToFolderToast(folder.name)
          })
        )
      }

      track(
        make({
          eventName: Name.PLAYLIST_LIBRARY_ADD_PLAYLIST_TO_FOLDER
        })
      )
    }
  })
}
