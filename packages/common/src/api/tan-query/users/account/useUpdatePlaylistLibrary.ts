import type { AudiusSdkWithServices } from '@audius/sdk/services'
import { useQueryClient, useMutation, QueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'
import { Dispatch } from 'redux'

import { useQueryContext } from '~/api/tan-query/utils/QueryContext'
import { ID } from '~/models/Identifiers'
import { PlaylistLibrary } from '~/models/PlaylistLibrary'
import { accountActions } from '~/store/account'
import { removePlaylistLibraryDuplicates } from '~/store/playlist-library/helpers'

import { updateUser } from '../useUpdateUser'

import { getCurrentAccountQueryKey } from './useCurrentAccount'
import { useCurrentUserId } from './useCurrentUserId'

export const useUpdatePlaylistLibrary = () => {
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { audiusSdk } = useQueryContext()
  return useMutation({
    mutationFn: async (playlistLibrary: PlaylistLibrary) => {
      updatePlaylistLibrary(
        await audiusSdk(),
        currentUserId,
        playlistLibrary,
        queryClient,
        dispatch
      )
    }
  })
}

// feature-tan-query TODO: migrate saga usages, then remove this
export const updatePlaylistLibrary = async (
  audiusSdk: AudiusSdkWithServices,
  userId: ID | null | undefined,
  playlistLibrary: PlaylistLibrary,
  queryClient: QueryClient,
  dispatch: Dispatch<any>
) => {
  if (!userId) return
  const dedupedPlaylistLibrary =
    removePlaylistLibraryDuplicates(playlistLibrary)
  queryClient.setQueryData(getCurrentAccountQueryKey(), (old) => {
    if (!old) return old
    return { ...old, playlist_library: dedupedPlaylistLibrary }
  })

  await updateUser(audiusSdk, userId, {
    playlist_library: dedupedPlaylistLibrary
  })

  // feature-tan-query TODO: just set localStorage directly
  // Triggers sync to local storage
  dispatch(accountActions.updatePlaylistLibrary(dedupedPlaylistLibrary))
}
