import {
  playlistMetadataForCreateWithSDK,
  userCollectionMetadataFromSDK
} from '@audius/common/adapters'
import {
  primeCollectionDataSaga,
  queryAccountUser,
  queryCollection,
  queryCurrentUserId,
  queryTrack,
  queryUser,
  updateCollectionData
} from '@audius/common/api'
import {
  Name,
  Kind,
  CollectionMetadata,
  ID,
  Track
} from '@audius/common/models'
import { newCollectionMetadata } from '@audius/common/schemas'
import {
  accountActions,
  cacheCollectionsActions,
  libraryPageActions,
  LibraryCategory,
  confirmerActions,
  EditCollectionValues,
  RequestConfirmationError,
  getSDK
} from '@audius/common/store'
import { makeKindId, Nullable, route } from '@audius/common/utils'
import { Id, OptionalId } from '@audius/sdk'
import { call, put, takeLatest } from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'
import { ensureLoggedIn } from 'common/utils/ensureLoggedIn'
import { waitForWrite } from 'utils/sagaHelpers'

const { addLocalCollection } = libraryPageActions

const { requestConfirmation } = confirmerActions
const { collectionPage } = route

export function* createPlaylistSaga() {
  yield* takeLatest(
    cacheCollectionsActions.CREATE_PLAYLIST,
    createPlaylistWorker
  )
}

function* createPlaylistWorker(
  action: ReturnType<typeof cacheCollectionsActions.createPlaylist>
) {
  // Return early if this is an album
  if (action.isAlbum) return

  yield* waitForWrite()
  const userId = yield* call(ensureLoggedIn)
  const {
    initTrackId,
    formFields,
    source,
    noticeType,
    isAlbum = false
  } = action
  const collection = newCollectionMetadata({ ...formFields, is_album: isAlbum })
  const sdk = yield* getSDK()
  const collectionId = yield* call([
    sdk.playlists,
    sdk.playlists.generatePlaylistId
  ])
  if (!collectionId) return

  const initTrack = yield* queryTrack(initTrackId)

  if (initTrack) {
    collection.cover_art_sizes = initTrack.cover_art_sizes
  }

  yield* call(
    optimisticallySavePlaylist,
    collectionId,
    collection,
    initTrack as Track
  )
  yield* put(
    cacheCollectionsActions.createPlaylistRequested(
      collectionId,
      noticeType,
      isAlbum
    )
  )
  yield* call(
    createAndConfirmPlaylist,
    collectionId,
    userId,
    collection,
    initTrack as Track,
    source,
    isAlbum
  )
}

function* optimisticallySavePlaylist(
  playlistId: ID,
  formFields: Partial<CollectionMetadata>,
  initTrack: Nullable<Track>
) {
  const accountUser = yield* call(queryAccountUser)
  if (!accountUser) return
  const { user_id, handle } = accountUser
  const playlist: Partial<CollectionMetadata> & { playlist_id: ID } = {
    playlist_id: playlistId,
    ...formFields
  }

  const initTrackOwner = yield* queryUser(initTrack?.owner_id)

  playlist.playlist_owner_id = user_id
  playlist.is_private = true
  playlist.playlist_contents = {
    track_ids: initTrack
      ? [
          {
            time: Math.round(Date.now() / 1000), // must use seconds
            track: initTrack.track_id
          }
        ]
      : []
  }
  playlist.tracks = initTrack
    ? [
        {
          ...initTrack,
          user: initTrackOwner!
        }
      ]
    : []
  playlist.track_count = initTrack ? 1 : 0
  playlist.permalink = collectionPage(
    handle,
    playlist.playlist_name,
    playlistId,
    undefined,
    playlist.is_album
  )

  yield* call(primeCollectionDataSaga, [playlist as CollectionMetadata])

  yield* put(
    accountActions.addAccountPlaylist({
      id: playlistId,
      name: playlist.playlist_name as string,
      is_album: !!playlist.is_album,
      user: { id: user_id, handle },
      permalink: playlist?.permalink
    })
  )

  yield* put(
    addLocalCollection({
      collectionId: playlistId,
      isAlbum: !!playlist.is_album,
      category: LibraryCategory.Favorite
    })
  )
}

function* createAndConfirmPlaylist(
  playlistId: ID,
  userId: ID,
  formFields: EditCollectionValues,
  initTrack: Nullable<Track>,
  source: string,
  isAlbum: boolean
) {
  const sdk = yield* getSDK()

  const event = make(Name.PLAYLIST_START_CREATE, {
    source,
    artworkSource: formFields.artwork
      ? formFields.artwork.source
      : formFields.cover_art_sizes
  })
  yield* put(event)

  function* confirmPlaylist() {
    const userId = yield* call(queryCurrentUserId)
    if (!userId) {
      throw new Error('No userId set, cannot repost collection')
    }

    yield* call([sdk.playlists, sdk.playlists.createPlaylist], {
      userId: Id.parse(userId),
      playlistId: Id.parse(playlistId),
      trackIds: initTrack ? [Id.parse(initTrack.track_id)] : undefined,
      metadata: playlistMetadataForCreateWithSDK(formFields)
    })

    // Merge the confirmed playlist with the optimistic playlist, preferring
    // optimistic data in case other unconfirmed edits have been made.
    const { data: playlist } = yield* call(
      [sdk.full.playlists, sdk.full.playlists.getPlaylist],
      {
        userId: OptionalId.parse(userId),
        playlistId: Id.parse(playlistId)
      }
    )

    const confirmedPlaylist = playlist?.[0]
      ? userCollectionMetadataFromSDK(playlist[0])
      : null
    if (!confirmedPlaylist) {
      throw new Error(
        `Could not find confirmed playlist creation for playlist id ${playlistId}`
      )
    }

    const optimisticPlaylist = yield* queryCollection(playlistId)

    const reformattedPlaylist = {
      ...confirmedPlaylist,
      ...optimisticPlaylist,
      cover_art_cids: confirmedPlaylist.cover_art_cids,
      playlist_id: confirmedPlaylist.playlist_id
    }

    yield* call(updateCollectionData, [reformattedPlaylist])

    yield* put(
      make(Name.PLAYLIST_COMPLETE_CREATE, {
        source,
        status: 'success'
      })
    )

    yield* put(cacheCollectionsActions.createPlaylistSucceeded())

    return confirmedPlaylist
  }

  function* onError(result: RequestConfirmationError) {
    const { message, error, timeout } = result
    yield* put(
      make(Name.PLAYLIST_COMPLETE_CREATE, {
        source,
        status: 'failure'
      })
    )
    yield* put(
      cacheCollectionsActions.createPlaylistFailed(
        error,
        { userId, formFields, source },
        { message, timeout }
      )
    )
  }

  yield* put(
    requestConfirmation(
      makeKindId(Kind.COLLECTIONS, playlistId),
      confirmPlaylist,
      function* () {},
      onError
    )
  )
}
