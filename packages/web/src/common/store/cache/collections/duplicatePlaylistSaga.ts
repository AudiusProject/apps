import { cacheCollectionsActions, toastActions } from '@audius/common/store'
import { call, delay, put, take, takeEvery } from 'typed-redux-saga'

const { toast } = toastActions

const INTER_DISPATCH_DELAY_MS = 30

const messages = {
  duplicated: (count: number, isAlbum: boolean) =>
    `Duplicated ${isAlbum ? 'album' : 'playlist'} with ${count} ${
      count === 1 ? 'track' : 'tracks'
    }`,
  duplicatedNoTracks: (isAlbum: boolean) =>
    `Duplicated ${isAlbum ? 'album' : 'playlist'}`
}

export function* duplicatePlaylistSaga() {
  yield* takeEvery(
    cacheCollectionsActions.DUPLICATE_PLAYLIST,
    duplicatePlaylistWorker
  )
}

function* duplicatePlaylistWorker(
  action: ReturnType<typeof cacheCollectionsActions.duplicatePlaylist>
) {
  const { formFields, trackIds, source, isAlbum } = action
  const initTrackId = trackIds.length > 0 ? trackIds[0] : null

  const createAction = isAlbum
    ? cacheCollectionsActions.createAlbum
    : cacheCollectionsActions.createPlaylist

  yield* put(createAction(formFields, source, initTrackId, 'route'))

  if (trackIds.length <= 1) {
    if (trackIds.length === 0) {
      yield* put(toast({ content: messages.duplicatedNoTracks(isAlbum) }))
    } else {
      yield* put(toast({ content: messages.duplicated(1, isAlbum) }))
    }
    return
  }

  const requestedAction = yield* take(
    cacheCollectionsActions.CREATE_PLAYLIST_REQUESTED
  )
  const newPlaylistId = (requestedAction as unknown as { playlistId: number })
    .playlistId

  for (let i = 1; i < trackIds.length; i += 1) {
    yield* put(
      cacheCollectionsActions.addTrackToPlaylist(trackIds[i], newPlaylistId, {
        silent: true
      })
    )
    yield* delay(INTER_DISPATCH_DELAY_MS)
  }

  yield* call(function* () {
    yield* put(
      toast({ content: messages.duplicated(trackIds.length, isAlbum) })
    )
  })
}
