import { queryAccountUser, queryCurrentAccount } from '@audius/common/api'
import { PlaylistLibraryID } from '@audius/common/models'
import {
  accountActions,
  playlistLibraryActions,
  playlistLibraryHelpers
} from '@audius/common/store'
import { fork, put, select, takeEvery } from 'typed-redux-saga'

import { updateProfileAsync } from 'common/store/profile/sagas'
import { waitForWrite } from 'utils/sagaHelpers'

import { watchAddToFolderSaga } from './watchAddToFolderSaga'
import { watchReorderLibrarySaga } from './watchReorderLibrarySaga'

const { update } = playlistLibraryActions
const {
  getPlaylistsNotInLibrary,
  removePlaylistLibraryDuplicates,
  removeFromPlaylistLibrary
} = playlistLibraryHelpers

function* watchUpdatePlaylistLibrary() {
  yield* takeEvery(
    update.type,
    function* handleUpdatePlaylistLibrary(action: ReturnType<typeof update>) {
      yield* waitForWrite()
      const { playlistLibrary } = action.payload

      const accountUser = yield* queryAccountUser()
      if (!accountUser) return

      const updatedPlaylistLibrary =
        removePlaylistLibraryDuplicates(playlistLibrary)

      yield* put(accountActions.updatePlaylistLibrary(updatedPlaylistLibrary))

      yield* fork(updateProfileAsync, {
        metadata: { ...accountUser, playlist_library: updatedPlaylistLibrary }
      })
    }
  )
}

export function* removePlaylistFromLibrary(id: PlaylistLibraryID) {
  const account = yield* queryCurrentAccount()
  const library = account?.playlistLibrary
  if (!library) return
  const { library: updatedLibrary } = removeFromPlaylistLibrary(library, id)
  yield* put(update({ playlistLibrary: updatedLibrary }))
}

function* watchAddAccountPlaylist() {
  yield* takeEvery(
    accountActions.addAccountPlaylist.type,
    function* handleAddAccountPlaylist() {
      yield* waitForWrite()
      const account = yield* select((state) => state.account)
      const playlistLibrary = account.playlistLibrary
      if (!playlistLibrary) return
      yield* put(update({ playlistLibrary }))
    }
  )
}

function* watchRepairEmptyPlaylistLibrary() {
  yield* takeEvery(
    accountActions.fetchAccountSucceeded.type,
    function* handleRepairEmptyPlaylistLibrary() {
      yield* waitForWrite()
      const account = yield* select((state) => state.account)
      const { collections, playlistLibrary } = account
      const collectionCount = Object.keys(collections).length
      if (collectionCount === 0) return

      const missing = getPlaylistsNotInLibrary(
        playlistLibrary ?? null,
        collections
      )
      const missingCount = Object.keys(missing).length
      if (missingCount === 0) return

      const existingContents = playlistLibrary?.contents ?? []
      const newContents = [
        ...existingContents,
        ...Object.values(missing).map((c) => ({
          playlist_id: c.id,
          type: 'playlist' as const
        }))
      ]
      yield* put(update({ playlistLibrary: { contents: newContents } }))
    }
  )
}

export default function sagas() {
  const sagas = [
    watchUpdatePlaylistLibrary,
    watchAddAccountPlaylist,
    watchRepairEmptyPlaylistLibrary,
    watchReorderLibrarySaga,
    watchAddToFolderSaga
  ]
  return sagas
}
