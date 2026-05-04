import { Id } from '@audius/sdk'
import { takeEvery, put, call } from 'typed-redux-saga'

import {
  userCollectionMetadataFromSDK,
  userMetadataFromSDK,
  transformAndCleanList
} from '~/adapters'
import { queryCollection, queryTrack, queryUser } from '~/api'
import { TQCollection } from '~/api/tan-query/models'
import { showNiceModal } from '~/services/nice-modal-bridge'
import { getSDK } from '~/store/sdkUtils'

import { setVisibility } from '../modals/parentSlice'

import { open, requestOpen } from './slice'
import { ShareModalRequestOpenAction } from './types'

function* handleRequestOpen(action: ShareModalRequestOpenAction) {
  switch (action.payload.type) {
    case 'track':
    case 'contest': {
      const { trackId, source, type } = action.payload
      const track = yield* queryTrack(trackId)
      if (!track) return
      const artist = yield* queryUser(track.owner_id)
      if (!artist) return
      // Both `track` and `contest` share the same fetch shape; the
      // type distinguishes which URL + share text to use downstream.
      yield put(open({ type, track, source, artist }))
      break
    }
    case 'profile': {
      const { profileId, source, type } = action.payload
      const profile = yield* queryUser(profileId)
      if (!profile) return
      yield put(open({ type, profile, source }))
      break
    }
    case 'collection': {
      const { collectionId, source } = action.payload
      const sdk = yield* getSDK()

      let collection = yield* queryCollection(collectionId)
      if (!collection) {
        const { data = [] } = yield* call(
          [sdk.playlists, sdk.playlists.getPlaylist],
          {
            playlistId: Id.parse(collectionId)
          }
        )
        const [transformedCollection] = transformAndCleanList(
          data,
          userCollectionMetadataFromSDK
        )
        if (transformedCollection) {
          collection = transformedCollection as unknown as TQCollection
        }
      }
      if (!collection) return

      let owner = yield* queryUser(collection.playlist_owner_id)
      if (!owner) {
        const response = yield* call([sdk.users, sdk.users.getUser], {
          id: Id.parse(collection.playlist_owner_id)
        })
        const [transformedUser] = transformAndCleanList(
          response?.data != null ? [response.data] : [],
          userMetadataFromSDK
        )
        if (transformedUser) {
          owner = transformedUser
        }
      }
      if (!owner) return

      if (collection.is_album) {
        yield put(
          open({ type: 'album', album: collection, artist: owner, source })
        )
      } else {
        yield put(
          open({
            type: 'playlist',
            playlist: collection,
            creator: owner,
            source
          })
        )
      }
      break
    }
  }

  yield put(setVisibility({ modal: 'Share', visible: true }))
}

function* watchHandleRequestOpen() {
  yield takeEvery(requestOpen, handleRequestOpen)
}

/**
 * Bridge: any caller dispatching `setVisibility({ modal: 'Share', visible: true })`
 * (legacy callers like `onCancelAction` from CreateChatModal, plus the
 * `handleRequestOpen` saga above) gets translated into a `NiceModal.show('Share')`
 * call. This lets the rest of the codebase migrate at its own pace — once all
 * callers go through `showNiceModal` directly, this bridge can be removed.
 */
function* watchOpenShareViaSetVisibility() {
  yield takeEvery(
    setVisibility,
    function* (action: ReturnType<typeof setVisibility>) {
      const { modal, visible } = action.payload
      if (modal === 'Share' && visible === true) {
        yield call(showNiceModal, 'Share')
      }
    }
  )
}

export default function sagas() {
  return [watchHandleRequestOpen, watchOpenShareViaSetVisibility]
}
