import { queryCollection } from '@audius/common/api'
import { cacheCollectionsActions, toastActions } from '@audius/common/store'
import { put, takeEvery } from 'typed-redux-saga'

import { push } from 'utils/navigation'

const { toast } = toastActions

const messages = {
  createdToast: (isAlbum: boolean) =>
    `${isAlbum ? 'Album' : 'Playlist'} Created`,
  view: 'View'
}
export function* createPlaylistRequestedSaga() {
  yield* takeEvery(
    cacheCollectionsActions.CREATE_PLAYLIST_REQUESTED,
    function* (
      action: ReturnType<typeof cacheCollectionsActions.createPlaylistRequested>
    ) {
      const { playlistId, noticeType, isAlbum } = action
      const playlist = yield* queryCollection(playlistId)
      if (!playlist?.permalink) return

      const { permalink } = playlist

      switch (noticeType) {
        case 'toast': {
          yield* put(
            toast({
              content: messages.createdToast(isAlbum),
              linkText: messages.view,
              link: permalink
            })
          )
          break
        }
        case 'route': {
          yield* put(push(permalink))
          break
        }
      }
    }
  )
}
