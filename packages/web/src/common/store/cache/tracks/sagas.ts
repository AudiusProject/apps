import {
  userTrackMetadataFromSDK,
  trackMetadataForUploadToSdk,
  fileToSdk
} from '@audius/common/adapters'
import {
  getStemsQueryKey,
  getUserQueryKey,
  queryAccountUser,
  queryCurrentUserId,
  queryTrack,
  queryUser,
  updateTrackData
} from '@audius/common/api'
import {
  Name,
  Kind,
  Track,
  ID,
  Remix,
  StemUploadWithFile
} from '@audius/common/models'
import {
  getContext,
  cacheTracksActions as trackActions,
  confirmerActions,
  TrackMetadataForUpload,
  stemsUploadActions,
  stemsUploadSelectors,
  getSDK
} from '@audius/common/store'
import {
  formatMusicalKey,
  makeKindId,
  squashNewLines,
  uuid,
  waitForAccount
} from '@audius/common/utils'
import { Id, OptionalId } from '@audius/sdk'
import { call, fork, put, select, takeEvery } from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'
import * as signOnActions from 'common/store/pages/signon/actions'
import { updateProfileAsync } from 'common/store/profile/sagas'
import { addPremiumMetadata } from 'common/store/upload/sagaHelpers'
import { waitForWrite } from 'utils/sagaHelpers'

import { recordEditTrackAnalytics } from './sagaHelpers'

const { startStemUploads } = stemsUploadActions
const { getCurrentUploads } = stemsUploadSelectors

type TrackWithRemix = Pick<Track, 'track_id' | 'title'> & {
  remix_of: { tracks: Pick<Remix, 'parent_track_id'>[] } | null
}

export function* trackNewRemixEvent(track: TrackWithRemix) {
  yield* waitForAccount()
  const accountUser = yield* call(queryAccountUser)
  const accountHandle = accountUser?.handle
  if (!track.remix_of || !accountHandle) return
  const remixParentTrack = track.remix_of.tracks[0]
  const parentTrack = yield* queryTrack(remixParentTrack.parent_track_id)
  const parentTrackUser = parentTrack
    ? yield* queryUser(parentTrack.owner_id)
    : null
  yield* put(
    make(Name.REMIX_NEW_REMIX, {
      id: track.track_id,
      handle: accountHandle,
      title: track.title,
      parent_track_id: remixParentTrack.parent_track_id,
      parent_track_title: parentTrack ? parentTrack.title : '',
      parent_track_user_handle: parentTrackUser ? parentTrackUser.handle : ''
    })
  )
}

function* editTrackAsync(action: ReturnType<typeof trackActions.editTrack>) {
  yield* call(waitForWrite)
  action.formFields.description =
    squashNewLines(action.formFields.description) ?? null

  const currentTrack = yield* queryTrack(action.trackId)
  if (!currentTrack) return
  const isPublishing = currentTrack._is_publishing
  const wasUnlisted = currentTrack.is_unlisted
  const isNowListed = !action.formFields.is_unlisted

  if (!isPublishing && wasUnlisted && isNowListed) {
    currentTrack._is_publishing = true
  }

  yield* call(updateTrackData, [currentTrack])

  const trackForEdit = yield* addPremiumMetadata(action.formFields)

  // Format musical key
  trackForEdit.musical_key =
    formatMusicalKey(trackForEdit.musical_key || undefined) ?? null

  // Format bpm
  trackForEdit.bpm = trackForEdit.bpm ? Number(trackForEdit.bpm) : null
  trackForEdit.is_custom_bpm =
    currentTrack.is_custom_bpm ||
    (!!trackForEdit.bpm && trackForEdit.bpm !== currentTrack.bpm)
  trackForEdit.is_custom_musical_key =
    currentTrack.is_custom_musical_key ||
    (!!trackForEdit.musical_key &&
      trackForEdit.musical_key !== currentTrack.musical_key)

  yield* call(
    confirmEditTrack,
    action.trackId,
    trackForEdit,
    wasUnlisted,
    isNowListed,
    currentTrack
  )

  const track = { ...trackForEdit } as Track & TrackMetadataForUpload
  track.track_id = action.trackId

  if (track.stems) {
    const inProgressStemUploads = yield* select(
      getCurrentUploads,
      track.track_id
    )

    const queryClient = yield* getContext('queryClient')

    const existingStems =
      queryClient.getQueryData(getStemsQueryKey(track.track_id)) ?? []

    // upload net new stems
    const addedStems = track.stems.filter((stem) => {
      return !existingStems.find((existingStem) => {
        return existingStem.track_id === stem.metadata.track_id
      })
    })

    const addedStemsWithFiles = addedStems.filter(
      (stem) => 'file' in stem
    ) as StemUploadWithFile[]

    if (addedStemsWithFiles.length > 0) {
      yield* put(
        startStemUploads({
          parentId: track.track_id,
          uploads: addedStemsWithFiles,
          batchUID: uuid()
        })
      )
    }

    // delete removed stems
    const removedStems = existingStems
      .filter((existingStem) => {
        return !track.stems?.find(
          (stem) => stem.metadata.track_id === existingStem.track_id
        )
      })
      .filter((existingStem) => {
        return !inProgressStemUploads.find(
          (upload) => upload.metadata.track_id === existingStem.track_id
        )
      })

    for (const stem of removedStems) {
      yield* put(trackActions.deleteTrack(stem.track_id))
    }
  }

  yield* call(updateTrackData, [track])
  yield* put(trackActions.editTrackSucceeded())

  // This is a new remix
  if (
    track?.remix_of?.tracks?.[0]?.parent_track_id &&
    currentTrack?.remix_of?.tracks?.[0]?.parent_track_id !==
      track?.remix_of?.tracks?.[0]?.parent_track_id
  ) {
    // This is a new remix
    yield* call(trackNewRemixEvent, track)
  }
}

function* confirmEditTrack(
  trackId: ID,
  formFields: TrackMetadataForUpload,
  wasUnlisted: boolean,
  isNowListed: boolean,
  currentTrack: Track
) {
  yield* waitForWrite()
  const sdk = yield* getSDK()
  const generatePreview =
    (formFields.preview_start_seconds !== null &&
      formFields.preview_start_seconds !== undefined &&
      currentTrack.preview_start_seconds !==
        formFields.preview_start_seconds) ||
    currentTrack.track_cid !== formFields.track_cid

  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.TRACKS, trackId),
      function* () {
        yield* waitForAccount()
        // Need to poll with the new track name in case it changed
        const userId = yield* call(queryCurrentUserId)
        if (!userId) {
          throw new Error('No userId set, cannot edit track')
        }

        if (!userId) return
        const coverArtFile =
          formFields.artwork && 'file' in formFields.artwork
            ? formFields.artwork.file
            : undefined

        yield* call([sdk.tracks, sdk.tracks.updateTrack], {
          userId: Id.parse(userId),
          trackId: Id.parse(trackId),
          imageFile: coverArtFile
            ? fileToSdk(coverArtFile, 'cover_art')
            : undefined,
          metadata: trackMetadataForUploadToSdk(formFields),
          generatePreview
        })

        const { data } = yield* call([sdk.tracks, sdk.tracks.getTrack], {
          trackId: Id.parse(trackId),
          userId: OptionalId.parse(userId)
        })
        return data ? userTrackMetadataFromSDK(data) : null
      },
      function* (confirmedTrack: TrackMetadataForUpload & Track) {
        if (wasUnlisted && isNowListed) {
          confirmedTrack._is_publishing = false
        }

        yield* call(updateTrackData, [confirmedTrack])
        yield* call(recordEditTrackAnalytics, currentTrack, confirmedTrack)
      },
      function* ({ error, message, timeout }) {
        const reportToSentry = yield* getContext('reportToSentry')
        reportToSentry({
          error,
          additionalInfo: { message, timeout, trackId, formFields },
          name: 'Edit Track'
        })
        yield* put(trackActions.editTrackFailed())
      }
    )
  )
}

function* watchEditTrack() {
  yield* takeEvery(trackActions.EDIT_TRACK, editTrackAsync)
}

function* deleteTrackAsync(
  action: ReturnType<typeof trackActions.deleteTrack>
) {
  yield* waitForWrite()
  const user = yield* call(queryAccountUser)
  const queryClient = yield* getContext('queryClient')
  if (!user) {
    yield* put(signOnActions.openSignOn(false))
    return
  }
  const userId = user.user_id

  const track = yield* queryTrack(action.trackId)
  if (!track) return

  // Before deleting, check if the track is set as the artist pick & delete if so
  if (user.artist_pick_track_id === action.trackId) {
    queryClient.setQueryData(getUserQueryKey(userId), (prevUser) => {
      if (!prevUser) return prevUser
      return {
        ...prevUser,
        artist_pick_track_id: null
      }
    })
    const user = yield* call(queryUser, userId)
    yield* fork(updateProfileAsync, { metadata: user })
  }

  yield* call(updateTrackData, [{ ...track, _marked_deleted: true }])
  yield* call(confirmDeleteTrack, track)
}

function* confirmDeleteTrack(track: Track) {
  const { track_id: trackId, stem_of: stemOf } = track
  yield* waitForWrite()
  const sdk = yield* getSDK()
  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.TRACKS, trackId),
      function* () {
        yield* waitForAccount()
        const userId = yield* call(queryCurrentUserId)
        if (!userId) {
          throw new Error('No userId set, cannot delete track')
        }

        yield* call([sdk.tracks, sdk.tracks.deleteTrack], {
          userId: Id.parse(userId),
          trackId: Id.parse(trackId)
        })

        const track = yield* queryTrack(trackId)

        if (!track) return
        const { data } = yield* call([sdk.tracks, sdk.tracks.getTrack], {
          trackId: Id.parse(trackId),
          userId: OptionalId.parse(userId)
        })
        return data ? userTrackMetadataFromSDK(data) : null
      },
      function* (deletedTrack: Track) {
        // NOTE: we do not delete from the cache as the track may be playing
        yield* put(trackActions.deleteTrackSucceeded(deletedTrack.track_id))

        // Record Delete Event
        const event = make(Name.DELETE, {
          kind: 'track',
          id: trackId
        })
        yield* put(event)
        if (stemOf) {
          const parentTrackId = stemOf?.parent_track_id

          const queryClient = yield* getContext('queryClient')
          queryClient.invalidateQueries({
            queryKey: getStemsQueryKey(parentTrackId)
          })

          const stemDeleteEvent = make(Name.STEM_DELETE, {
            id: trackId,
            parent_track_id: parentTrackId,
            category: stemOf.category
          })
          yield* put(stemDeleteEvent)
        }
      },
      function* () {
        // On failure, do not mark the track as deleted
        yield* call(updateTrackData, [{ ...track, _marked_deleted: false }])
      }
    )
  )
}

function* watchDeleteTrack() {
  yield* takeEvery(trackActions.DELETE_TRACK, deleteTrackAsync)
}

const sagas = () => {
  return [watchEditTrack, watchDeleteTrack]
}

export default sagas
