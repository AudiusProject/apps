import { cacheCollectionsActions, toastActions } from '@audius/common/store'
import { uuid } from '@audius/common/utils'
import { put, takeEvery } from 'typed-redux-saga'

import { navigationRef } from 'app/components/navigation-container/NavigationContainer'

const { registerToast } = toastActions

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

      switch (noticeType) {
        case 'toast': {
          yield* put(
            registerToast({
              content: messages.createdToast(isAlbum),
              key: uuid(),
              linkText: messages.view,
              linkConfig: { screen: 'Collection', params: { id: playlistId } }
            })
          )
          break
        }
        case 'route': {
          if (navigationRef.isReady()) {
            navigationRef.navigate('Collection', { id: playlistId })
          }
          break
        }
      }
    }
  )
}
