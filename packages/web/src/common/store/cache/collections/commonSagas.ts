import {
  albumMetadataForUpdateWithSDK,
  fileToSdk,
  playlistMetadataForUpdateWithSDK,
  userCollectionMetadataFromSDK
} from '@audius/common/adapters'
import {
  queryCollection,
  queryCollectionTracks,
  queryCurrentUserId,
  queryTrack,
  updateCollectionData
} from '@audius/common/api'
import {
  Name,
  Kind,
  PlaylistContents,
  ID,
  Collection,
  Track,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import {
  accountActions,
  cacheCollectionsActions as collectionActions,
  PlaylistOperations,
  toastActions,
  getContext,
  confirmerActions,
  trackPageActions,
  getSDK,
  publishHiddenTracksConfirmationModalActions,
  publishHiddenTracksConfirmed,
  keepHiddenTracksPrivate
} from '@audius/common/store'
import {
  squashNewLines,
  removeNullable,
  makeKindId,
  updatePlaylistArtwork
} from '@audius/common/utils'
import { Id, OptionalId } from '@audius/sdk'
import {
  all,
  call,
  put,
  race,
  take,
  takeEvery,
  takeLatest
} from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'
import watchTrackErrors from 'common/store/cache/collections/errorSagas'
import * as signOnActions from 'common/store/pages/signon/actions'
import { getUSDCMetadata } from 'common/store/upload/sagaHelpers'
import { ensureLoggedIn } from 'common/utils/ensureLoggedIn'
import { waitForWrite } from 'utils/sagaHelpers'

import { watchAddTrackToPlaylist } from './addTrackToPlaylistSaga'
import { confirmOrderPlaylist } from './confirmOrderPlaylist'
import { createAlbumSaga } from './createAlbumSaga'
import { createPlaylistSaga } from './createPlaylistSaga'
import {
  hasPendingPlaylistUpdates,
  isPlaylistConfirmerDone
} from './utils/hasPendingPlaylistUpdates'
import { optimisticUpdateCollection } from './utils/optimisticUpdateCollection'

const { manualClearToast, toast } = toastActions

const messages = {
  editToast: 'Changes saved!',
  removingTrack: 'Removing track...',
  removedTrack: 'Removed track',
  reorderStale: 'This collection was updated elsewhere. Try again.'
}

/** Tracks the user deliberately hid, as opposed to pre-releases. */
const getHiddenTracks = (playlistTracks: Track[] | null | undefined) =>
  (playlistTracks ?? []).filter(
    (track) => track.is_unlisted && !track.is_scheduled_release
  )

/**
 * Asks whether deliberately-hidden tracks should be published along with their
 * collection. Resolves to true when there is nothing to ask about.
 *
 * Ask before kicking off the write: the publish path applies the result inside
 * a confirmer callback, which serializes writes for the collection, so blocking
 * there would hold that queue for as long as the modal is up.
 */
export function* confirmPublishHiddenTracks(
  hiddenTrackCount: number,
  isAlbum: boolean
) {
  if (hiddenTrackCount === 0) return true

  // Mobile renders no drawer for this modal yet, so prompting there would block
  // the publish forever. Until the drawer lands it keeps the previous
  // publish-everything behavior.
  const isNativeMobile = yield* getContext('isNativeMobile')
  if (isNativeMobile) return true

  yield* put(
    publishHiddenTracksConfirmationModalActions.open({
      contentType: isAlbum ? 'album' : 'playlist',
      hiddenTrackCount
    })
  )

  const { confirmed } = yield* race({
    confirmed: take(publishHiddenTracksConfirmed.type),
    keepPrivate: take(keepHiddenTracksPrivate.type)
  })

  return !!confirmed
}

/**
 * Publishes the hidden tracks of a collection that is being made public.
 *
 * Deliberately-hidden tracks are published only when `publishHiddenTracks` is
 * set, which the caller obtains from `confirmPublishHiddenTracks`. Scheduled
 * releases are separate: they are published only as an early release, which
 * requires the collection itself to be a scheduled release whose tracks are all
 * scheduled.
 */
export function* publishHiddenChildTracks(
  playlist: Collection,
  playlistTracks: Track[] | null | undefined,
  publishHiddenTracks: boolean
) {
  const tracks = playlistTracks ?? []
  const isEachTrackScheduled = tracks.every(
    (track) => track.is_unlisted && track.is_scheduled_release
  )
  const isEarlyRelease = !!playlist.is_scheduled_release && isEachTrackScheduled

  for (const track of tracks) {
    if (!track.is_unlisted) continue
    const shouldPublish = track.is_scheduled_release
      ? isEarlyRelease
      : publishHiddenTracks
    if (shouldPublish) {
      yield* put(trackPageActions.makeTrackPublic(track.track_id))
    }
  }
}

/** Counts instances of trackId in a playlist. */
const countTrackIds = (
  playlistContents: PlaylistContents | undefined,
  trackId: ID
) => {
  return playlistContents
    ? playlistContents.track_ids
        .map((t) => t.track)
        .reduce<number>((acc: number, t) => {
          if (t === trackId) acc += 1
          return acc
        }, 0)
    : 0
}

/** EDIT PLAYLIST */

function* watchEditPlaylist() {
  yield* takeLatest(collectionActions.EDIT_PLAYLIST, editPlaylistAsync)
}

function* editPlaylistAsync(
  action: ReturnType<typeof collectionActions.editPlaylist>
) {
  const { playlistId, formFields, onComplete } = action
  try {
    const userId = yield* call(ensureLoggedIn)
    yield* waitForWrite()

    const isNative = yield* getContext('isNativeMobile')
    const { generatePlaylistArtwork } = yield* getContext('imageUtils')

    formFields.description = squashNewLines(formFields.description) ?? null

    // Updated the stored account playlist shortcut
    yield* put(
      accountActions.renameAccountPlaylist({
        collectionId: playlistId,
        name: formFields.playlist_name
      })
    )

    const pending = yield* hasPendingPlaylistUpdates(playlistId)
    const queryOpts = pending ? {} : { staleTime: 0 }
    let playlist: Collection = { ...formFields }
    const playlistTracks = yield* call(queryCollectionTracks, playlistId, {
      ...queryOpts
    })
    const updatedTracks = (yield* all(
      formFields.playlist_contents.track_ids.map(({ track }) =>
        call(queryTrack, track)
      )
    )).filter(removeNullable)

    // If the collection is a newly premium album, this will populate the premium metadata (price/splits/etc)
    if (
      playlist.is_album &&
      isContentUSDCPurchaseGated(playlist.stream_conditions)
    ) {
      playlist.stream_conditions = yield* call(
        getUSDCMetadata,
        playlist.stream_conditions
      )
    }

    // Optimistic update #1 to quickly update metadata and track lineup
    if (isNative) {
      yield* call(optimisticUpdateCollection, playlist)
    }

    playlist = yield* call(
      updatePlaylistArtwork,
      playlist,
      playlistTracks!,
      { updated: updatedTracks },
      { generateImage: generatePlaylistArtwork }
    )

    // Optimistic update #2 to update the artwork
    const playlistBeforeEdit = yield* queryCollection(playlistId)
    yield* call(optimisticUpdateCollection, playlist)

    yield* call(confirmEditPlaylist, playlistId, userId, playlist)
    yield* put(collectionActions.editPlaylistSucceeded())
    yield* put(toast({ content: messages.editToast }))
    if (onComplete) yield* call(onComplete, true)

    if (playlistBeforeEdit?.is_private && !playlist.is_private) {
      const playlistTracksForPublish = yield* call(
        queryCollectionTracks,
        playlistId
      )

      const publishHiddenTracks = yield* confirmPublishHiddenTracks(
        getHiddenTracks(playlistTracksForPublish).length,
        !!playlist.is_album
      )

      yield* publishHiddenChildTracks(
        playlistBeforeEdit,
        playlistTracksForPublish,
        publishHiddenTracks
      )
    }
  } catch (error) {
    if (onComplete) yield* call(onComplete, false, error as Error)
    throw error
  }
}

function* confirmEditPlaylist(
  playlistId: ID,
  userId: ID,
  formFields: Collection
) {
  const sdk = yield* getSDK()
  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.COLLECTIONS, playlistId),
      function* (_confirmedPlaylistId: ID) {
        const coverArtFile =
          formFields.artwork && 'file' in formFields.artwork
            ? formFields.artwork.file
            : undefined

        if (formFields.is_album) {
          yield* call([sdk.albums, sdk.albums.updateAlbum], {
            imageFile: coverArtFile
              ? fileToSdk(coverArtFile, 'cover_art')
              : undefined,
            metadata: albumMetadataForUpdateWithSDK(formFields),
            userId: Id.parse(userId),
            albumId: Id.parse(playlistId)
          })
        } else {
          yield* call([sdk.playlists, sdk.playlists.updatePlaylist], {
            imageFile: coverArtFile
              ? fileToSdk(coverArtFile, 'cover_art')
              : undefined,
            metadata: playlistMetadataForUpdateWithSDK(formFields),
            userId: Id.parse(userId),
            playlistId: Id.parse(playlistId)
          })
        }
        const { data: playlist } = yield* call(
          [sdk.playlists, sdk.playlists.getPlaylist],
          {
            userId: OptionalId.parse(userId),
            playlistId: Id.parse(playlistId)
          }
        )
        return playlist?.[0] ? userCollectionMetadataFromSDK(playlist[0]) : null
      },
      function* (confirmedPlaylist: Collection) {
        const done = yield* isPlaylistConfirmerDone(playlistId)
        if (!done) return
        yield* call(updateCollectionData, [confirmedPlaylist])
      },
      function* ({ error, timeout, message }) {
        yield* put(
          collectionActions.editPlaylistFailed(
            error,
            { playlistId, userId, formFields },
            { error, timeout }
          )
        )
      },
      (result: Collection) =>
        result.playlist_id ? result.playlist_id : playlistId
    )
  )
}

/** REMOVE TRACK FROM PLAYLIST */

function* watchRemoveTrackFromPlaylist() {
  yield* takeEvery(
    collectionActions.REMOVE_TRACK_FROM_PLAYLIST,
    removeTrackFromPlaylistAsync
  )
}

function* removeTrackFromPlaylistAsync(
  action: ReturnType<typeof collectionActions.removeTrackFromPlaylist>
) {
  const { playlistId, trackId, timestamp } = action
  yield* waitForWrite()
  const userId = yield* call(ensureLoggedIn)
  const { generatePlaylistArtwork } = yield* getContext('imageUtils')

  const pending = yield* hasPendingPlaylistUpdates(playlistId)
  const queryOpts = pending ? {} : { staleTime: 0 }
  const playlist = yield* queryCollection(playlistId, queryOpts)
  const playlistTracks = yield* call(queryCollectionTracks, playlistId, {
    ...queryOpts
  })
  const removedTrack = yield* queryTrack(trackId)

  const updatedPlaylist = yield* call(
    updatePlaylistArtwork,
    playlist!,
    playlistTracks!,
    { removed: removedTrack! },
    { generateImage: generatePlaylistArtwork }
  )

  // Find the index of the track based on the track's id and timestamp
  const index = updatedPlaylist.playlist_contents.track_ids.findIndex((t) => {
    if (t.track !== trackId) return false

    return t.metadata_time === timestamp || t.time === timestamp
  })
  if (index === -1) {
    console.error('Could not find the index of to-be-deleted track')
    return
  }

  const track = updatedPlaylist.playlist_contents.track_ids[index]
  updatedPlaylist.playlist_contents.track_ids.splice(index, 1)
  const count = countTrackIds(updatedPlaylist.playlist_contents, trackId)

  yield* put(
    toast({
      content: messages.removingTrack,
      key: `remove-track-${trackId}`
    })
  )

  yield* call(optimisticUpdateCollection, {
    ...updatedPlaylist,
    track_count: count
  })
  // UI already dispatches lineup remove - skip full refresh to preserve scroll
  yield* call(
    confirmRemoveTrackFromPlaylist,
    userId,
    action.playlistId,
    action.trackId,
    track.time,
    count,
    updatedPlaylist
  )
}

function* confirmRemoveTrackFromPlaylist(
  userId: ID,
  playlistId: ID,
  trackId: ID,
  timestamp: number,
  count: number,
  playlist: Collection
) {
  const sdk = yield* getSDK()
  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.COLLECTIONS, playlistId),
      function* (confirmedPlaylistId: ID) {
        const { artwork } = playlist
        const coverArtFile =
          artwork && 'file' in artwork ? (artwork?.file ?? null) : null

        yield* call([sdk.playlists, sdk.playlists.updatePlaylist], {
          metadata: playlistMetadataForUpdateWithSDK(playlist),
          userId: Id.parse(userId),
          playlistId: Id.parse(playlistId),
          imageFile: coverArtFile
            ? fileToSdk(coverArtFile, 'cover_art')
            : undefined
        })
        return confirmedPlaylistId
      },
      function* (_confirmedPlaylistId: ID) {
        const done = yield* isPlaylistConfirmerDone(playlistId)
        if (!done) return
        // Don't refetch - the backend may not have propagated yet, and a refetch
        // would overwrite our optimistic cache with stale data (tracks reappearing).
        // Our playlist state is correct since we just sent it to the API.
        yield* call(updateCollectionData, [playlist])
        yield* put(manualClearToast({ key: `remove-track-${trackId}` }))
        yield* put(
          toast({
            content: messages.removedTrack
          })
        )
      },
      function* ({ error, timeout, message }) {
        // Fail Call
        yield* put(
          collectionActions.removeTrackFromPlaylistFailed(
            error,
            { userId, playlistId, trackId, timestamp, count },
            { error, timeout }
          )
        )
      },
      (result: Collection) =>
        result.playlist_id ? result.playlist_id : playlistId,
      undefined,
      {
        operationId: PlaylistOperations.REMOVE_TRACK,
        parallelizable: false,
        useOnlyLastSuccessCall: false,
        squashable: true
      }
    )
  )
}

/** ORDER PLAYLIST */

function* watchOrderPlaylist() {
  yield* takeEvery(collectionActions.ORDER_PLAYLIST, orderPlaylistAsync)
}

function* orderPlaylistAsync(
  action: ReturnType<typeof collectionActions.orderPlaylist>
) {
  const { playlistId, trackIdsAndTimes } = action
  yield* waitForWrite()
  const userId = yield* call(ensureLoggedIn)
  const { generatePlaylistArtwork } = yield* getContext('imageUtils')

  const pending = yield* hasPendingPlaylistUpdates(playlistId)
  const queryOpts = pending ? {} : { staleTime: 0 }
  const oldPlaylist = yield* queryCollection(playlistId)
  const freshPlaylist = yield* queryCollection(playlistId, queryOpts)
  const tracks = yield* call(queryCollectionTracks, playlistId, {
    ...queryOpts
  })

  const oldTracks =
    oldPlaylist?.playlist_contents.track_ids.map(({ track }) => track) ?? []
  const freshTracks =
    freshPlaylist?.playlist_contents.track_ids.map(({ track }) => track) ?? []

  // If the lengths don't match or tracks are in a different order, the collection is stale
  const isStale =
    freshTracks.length !== oldTracks.length ||
    !freshTracks.every((t, i) => t === oldTracks[i])

  if (isStale) {
    // Collection has been modified elsewhere - fail the operation
    yield* put(
      toast({
        content: messages.reorderStale
      })
    )
    return
  }

  if (!freshPlaylist || !tracks) {
    yield* put(
      collectionActions.orderPlaylistFailed(
        new Error('Playlist or tracks not found'),
        { userId, playlistId },
        {}
      )
    )
    return
  }

  const trackIds = trackIdsAndTimes.map(({ id }) => id)

  const orderedTracks = trackIds.map(
    (trackId) => tracks!.find((track) => track.track_id === trackId)!
  )

  const updatedPlaylist = yield* call(
    updatePlaylistArtwork,
    freshPlaylist,
    tracks,
    { reordered: orderedTracks },
    { generateImage: generatePlaylistArtwork }
  )

  updatedPlaylist.playlist_contents.track_ids = trackIdsAndTimes.map(
    ({ id, time }) => ({ track: id, time })
  )

  yield* call(optimisticUpdateCollection, updatedPlaylist)
  yield* call(
    confirmOrderPlaylist,
    userId,
    playlistId,
    trackIds,
    updatedPlaylist
  )
}

/** PUBLISH PLAYLIST */

function* watchPublishPlaylist() {
  yield* takeEvery(collectionActions.PUBLISH_PLAYLIST, publishPlaylistAsync)
}

function* publishPlaylistAsync(
  action: ReturnType<typeof collectionActions.publishPlaylist>
) {
  yield* waitForWrite()
  const userId = yield* call(queryCurrentUserId)
  if (!userId) {
    yield* put(signOnActions.openSignOn(false))
    return
  }

  const event = make(Name.PLAYLIST_MAKE_PUBLIC, { id: action.playlistId })
  yield* put(event)

  const playlist = yield* queryCollection(action.playlistId)
  if (!playlist) return
  const playlistWithPublishing = { ...playlist, _is_publishing: true }

  // Ask before the write starts, so the modal never holds the confirmer queue.
  const tracksBeforePublish = yield* call(
    queryCollectionTracks,
    action.playlistId
  )
  const publishHiddenTracks = yield* confirmPublishHiddenTracks(
    getHiddenTracks(tracksBeforePublish).length,
    !!action.isAlbum
  )

  yield* call(updateCollectionData, [
    { playlist_id: playlist.playlist_id, _is_publishing: true }
  ])

  yield* confirmPublishPlaylist(
    userId,
    action.playlistId,
    playlistWithPublishing,
    publishHiddenTracks,
    action.dismissToastKey,
    action.isAlbum
  )
}

function* confirmPublishPlaylist(
  userId: ID,
  playlistId: ID,
  playlist: Collection,
  publishHiddenTracks: boolean,
  dismissToastKey?: string,
  isAlbum?: boolean
) {
  const sdk = yield* getSDK()
  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.COLLECTIONS, playlistId),
      function* (_confirmedPlaylistId: ID) {
        yield* call([sdk.playlists, sdk.playlists.updatePlaylist], {
          metadata: {
            ...playlistMetadataForUpdateWithSDK(playlist),
            isPrivate: false
          },
          userId: Id.parse(userId),
          playlistId: Id.parse(playlistId)
        })

        const { data } = yield* call(
          [sdk.playlists, sdk.playlists.getPlaylist],
          {
            userId: OptionalId.parse(userId),
            playlistId: Id.parse(playlistId)
          }
        )
        return data?.[0] ? userCollectionMetadataFromSDK(data[0]) : null
      },
      function* (confirmedPlaylist: Collection) {
        const done = yield* isPlaylistConfirmerDone(playlistId)
        if (!done) return
        confirmedPlaylist.is_private = false
        confirmedPlaylist._is_publishing = false
        yield* call(updateCollectionData, [confirmedPlaylist])

        const playlistTracks = yield* call(queryCollectionTracks, playlistId)

        yield* publishHiddenChildTracks(
          playlist,
          playlistTracks,
          publishHiddenTracks
        )

        if (dismissToastKey) {
          yield* put(manualClearToast({ key: dismissToastKey }))
        }

        yield* put(
          toast({
            content: `Your ${isAlbum ? 'album' : 'playlist'} is now public!`
          })
        )
      },
      function* ({ error, timeout, message }) {
        // Fail Call
        yield* put(
          collectionActions.publishPlaylistFailed(
            error,
            { userId, playlistId },
            { error, timeout }
          )
        )
      },
      (result: Collection) =>
        result.playlist_id ? result.playlist_id : playlistId
    )
  )
}

export default function sagas() {
  return [
    createPlaylistSaga,
    createAlbumSaga,
    watchEditPlaylist,
    watchAddTrackToPlaylist,
    watchRemoveTrackFromPlaylist,
    watchOrderPlaylist,
    watchPublishPlaylist,
    watchTrackErrors
  ]
}
