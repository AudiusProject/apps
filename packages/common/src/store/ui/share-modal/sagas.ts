import { Id } from '@audius/sdk'
import { takeEvery, put, call } from 'typed-redux-saga'

import { userCollectionMetadataFromSDK, userMetadataFromSDK } from '~/adapters'
import { queryCollection, queryTrack, queryUser } from '~/api'
import { TQCollection } from '~/api/tan-query/models'
import { getSDK } from '~/store/sdkUtils'

import { setVisibility } from '../modals/parentSlice'

import { open, requestOpen } from './slice'
import { ShareModalRequestOpenAction } from './types'

function* handleRequestOpen(action: ShareModalRequestOpenAction) {
  switch (action.payload.type) {
    case 'track': {
      const { trackId, source, type } = action.payload
      const track = yield* queryTrack(trackId)
      if (!track) return
      const artist = yield* queryUser(track.owner_id)
      if (!artist) return
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
        const playlistRes = yield* call(
          [sdk.playlists, sdk.playlists.getPlaylist],
          {
            playlistId: Id.parse(collectionId)
          }
        )
        const transformedCollection = playlistRes?.data?.[0]
          ? userCollectionMetadataFromSDK(playlistRes.data[0])
          : null
        if (transformedCollection) {
          collection = transformedCollection as unknown as TQCollection
        }
      }
      if (!collection) return

      let owner = yield* queryUser(collection.playlist_owner_id)
      if (!owner) {
        const userRes = yield* call([sdk.users, sdk.users.getUser], {
          id: Id.parse(collection.playlist_owner_id)
        })
        const transformedUser = userRes?.data
          ? userMetadataFromSDK(userRes.data)
          : null
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

export default function sagas() {
  return [watchHandleRequestOpen]
}
