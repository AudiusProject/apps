import {
  fileToSdk,
  playlistMetadataForUpdateWithSDK
} from '@audius/common/adapters'
import {
  queryCollection,
  queryTrack,
  queryTracks,
  updateCollectionData
} from '@audius/common/api'
import {
  Name,
  Kind,
  Collection,
  ID,
  ChallengeName
} from '@audius/common/models'
import {
  cacheCollectionsActions,
  cacheActions,
  PlaylistOperations,
  audioRewardsPageActions,
  toastActions,
  getContext,
  confirmerActions,
  getSDK
} from '@audius/common/store'
import {
  makeUid,
  makeKindId,
  updatePlaylistArtwork,
  Nullable
} from '@audius/common/utils'
import { Id } from '@audius/sdk/services'
import { call, put, takeEvery } from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'
import { ensureLoggedIn } from 'common/utils/ensureLoggedIn'
import { waitForWrite } from 'utils/sagaHelpers'

import {
  hasPendingPlaylistUpdates,
  isPlaylistConfirmerDone
} from './utils/hasPendingPlaylistUpdates'
import { optimisticUpdateCollection } from './utils/optimisticUpdateCollection'
import { addTrackToCollectionLineupIfViewing } from './utils/updateCollectionPageLineup'

const { setOptimisticChallengeCompleted } = audioRewardsPageActions

const { toast } = toastActions

const messages = {
  addedTrack: (collectionType: 'album' | 'playlist') =>
    `Added track to ${collectionType}`
}

type AddTrackToPlaylistAction = ReturnType<
  typeof cacheCollectionsActions.addTrackToPlaylist
>

// Returns current timestamp in seconds, which is the expected
// format for client-generated playlist entry timestamps
const getCurrentTimestamp = () => {
  return Math.floor(Date.now() / 1000)
}

/** ADD TRACK TO PLAYLIST */

export function* watchAddTrackToPlaylist() {
  yield* takeEvery(
    cacheCollectionsActions.ADD_TRACK_TO_PLAYLIST,
    addTrackToPlaylistAsync
  )
}

function* addTrackToPlaylistAsync(action: AddTrackToPlaylistAction) {
  const { playlistId, trackId } = action
  yield* waitForWrite()
  const userId = yield* call(ensureLoggedIn)
  const isNative = yield* getContext('isNativeMobile')
  const { generatePlaylistArtwork } = yield* getContext('imageUtils')

  const pending = yield* hasPendingPlaylistUpdates(playlistId)
  const queryOpts = pending ? {} : { staleTime: 0 }
  const playlist = yield* queryCollection(playlistId, queryOpts)
  const playlistTracks = yield* call(
    queryTracks,
    playlist?.playlist_contents.track_ids.map(({ track }) => track) ?? []
  )
  const track = yield* queryTrack(trackId)

  if (!playlist || !playlistTracks || !track) return

  const trackUid = makeUid(
    Kind.TRACKS,
    action.trackId,
    `collection:${action.playlistId}`
  )

  yield* put(
    cacheActions.subscribe(Kind.TRACKS, [{ uid: trackUid, id: action.trackId }])
  )

  playlist.playlist_contents = {
    track_ids: playlist.playlist_contents.track_ids.concat({
      track: action.trackId,
      // Replaced in indexing with block timestamp
      // Represents the server time seen when track was added to playlist
      time: 0,
      // Represents user-facing timestamp when the user added the track to the playlist.
      // This is needed to disambiguate between tracks added at the same time/potentiall in
      // the same block.
      metadata_time: getCurrentTimestamp(),
      uid: trackUid
    })
  }

  const count = playlist.track_count + 1
  playlist.track_count = count

  // Optimistic update #1 to show track in playlist quickly
  if (isNative) {
    yield* call(optimisticUpdateCollection, playlist)
  }

  const updatedPlaylist = yield* call(
    updatePlaylistArtwork,
    playlist,
    playlistTracks,
    { added: track },
    {
      generateImage: generatePlaylistArtwork
    }
  )

  // Optimistic update #2 to show updated artwork
  yield* call(optimisticUpdateCollection, updatedPlaylist)
  yield* call(
    addTrackToCollectionLineupIfViewing,
    action.playlistId,
    track,
    trackUid
  )

  yield* call(
    confirmAddTrackToPlaylist,
    userId,
    action.playlistId,
    action.trackId,
    count,
    updatedPlaylist
  )

  yield* put(
    setOptimisticChallengeCompleted({
      challengeId: 'first-playlist',
      specifier: userId.toString()
    })
  )

  yield* put(
    setOptimisticChallengeCompleted({
      challengeId: ChallengeName.FirstPlaylist,
      specifier: Id.parse(userId)
    })
  )

  const event = make(Name.PLAYLIST_ADD, {
    trackId: action.trackId,
    playlistId: action.playlistId
  })

  yield* put(event)

  yield* put(
    toast({
      content: messages.addedTrack(playlist.is_album ? 'album' : 'playlist')
    })
  )
}

function* confirmAddTrackToPlaylist(
  userId: ID,
  playlistId: ID,
  trackId: ID,
  count: number,
  playlist: Collection
) {
  const sdk = yield* getSDK()

  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.COLLECTIONS, playlistId),
      function* () {
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

        return playlistId
      },
      function* (_confirmedPlaylistId: ID) {
        const done = yield* isPlaylistConfirmerDone(playlistId)
        if (!done) return
        // Don't refetch - the backend may not have propagated yet, and a refetch
        // would overwrite our optimistic cache with stale data.
        yield* call(updateCollectionData, [playlist])
      },
      function* ({ error, timeout, message }) {
        // Fail Call
        yield* put(
          cacheCollectionsActions.addTrackToPlaylistFailed(
            error,
            { userId, playlistId, trackId, count },
            { message, timeout }
          )
        )
      },
      (result: { playlist_id: Nullable<ID> }) =>
        result.playlist_id ? result.playlist_id : playlistId,
      undefined,
      {
        operationId: PlaylistOperations.ADD_TRACK,
        parallelizable: false,
        useOnlyLastSuccessCall: false,
        squashable: true
      }
    )
  )
}
