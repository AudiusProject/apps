import { call, select } from 'typed-redux-saga'

import { PlaylistLibrary, PlaylistLibraryID } from '~/models/PlaylistLibrary'
import { getContext } from '~/store/effects'
import {
  removeFromPlaylistLibrary,
  removePlaylistLibraryDuplicates
} from '~/store/playlist-library/helpers'
import { CommonState } from '~/store/reducers'
import { getSDK } from '~/store/sdkUtils'

import { updatePlaylistLibrary as updatePlaylistLibraryAsync } from '../users/account/useUpdatePlaylistLibrary'

import { queryCurrentAccount, queryCurrentUserId } from './queryAccount'

/**
 * Saga-callable variant of useUpdatePlaylistLibrary's mutation. Persists the
 * library to the user's profile and updates the tan-query cache + the legacy
 * account redux slice.
 */
export function* updatePlaylistLibrarySaga(playlistLibrary: PlaylistLibrary) {
  const sdk = yield* getSDK()
  const queryClient = yield* getContext('queryClient')
  const dispatch = yield* getContext('dispatch')
  const userId = yield* call(queryCurrentUserId)
  if (!userId) return
  yield* call(
    updatePlaylistLibraryAsync,
    sdk,
    userId,
    removePlaylistLibraryDuplicates(playlistLibrary),
    queryClient,
    dispatch
  )
}

/**
 * Saga helper to remove a single entry from the playlist library and persist.
 * Used by the unsaveCollection flow.
 */
export function* removePlaylistFromLibrarySaga(id: PlaylistLibraryID) {
  const account = yield* call(queryCurrentAccount)
  const library = account?.playlistLibrary
  if (!library) return
  const { library: updatedLibrary } = removeFromPlaylistLibrary(library, id)
  yield* call(updatePlaylistLibrarySaga, updatedLibrary)
}

/**
 * Saga helper to persist the current account's playlist library after a local
 * mutation (e.g. `accountActions.addAccountPlaylist` dispatched, which updates
 * the redux account slice synchronously). Reads the now-updated redux library
 * and pushes it to the SDK + tan-query cache.
 */
export function* persistAccountPlaylistLibrarySaga() {
  const playlistLibrary = yield* select(
    (state: CommonState) => state.account.playlistLibrary
  )
  if (!playlistLibrary) return
  yield* call(updatePlaylistLibrarySaga, playlistLibrary)
}
