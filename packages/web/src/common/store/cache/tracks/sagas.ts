import {
  Name,
  DefaultSizes,
  SquareSizes,
  Kind,
  Track,
  Collection,
  ID,
  Remix,
  TrackMetadata,
  StemUploadWithFile
} from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import {
  Entry,
  getContext,
  accountSelectors,
  averageColorActions,
  cacheTracksSelectors,
  cacheTracksActions as trackActions,
  cacheUsersSelectors,
  cacheActions,
  confirmerActions,
  confirmTransaction,
  TrackMetadataForUpload,
  stemsUploadActions,
  stemsUploadSelectors
} from '@audius/common/store'
import {
  formatMusicalKey,
  formatUrlName,
  makeKindId,
  squashNewLines,
  uuid,
  waitForAccount,
  waitForValue
} from '@audius/common/utils'
import { call, fork, put, select, takeEvery } from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'
import { fetchUsers } from 'common/store/cache/users/sagas'
import * as signOnActions from 'common/store/pages/signon/actions'
import { updateProfileAsync } from 'common/store/profile/sagas'
import { addPremiumMetadata } from 'common/store/upload/sagaHelpers'
import { dominantColor } from 'utils/imageProcessingUtil'
import { waitForWrite } from 'utils/sagaHelpers'

import { recordEditTrackAnalytics } from './sagaHelpers'
import { fetchTrackStreamUrls } from './utils/fetchTrackStreamUrls'

const { startStemUploads } = stemsUploadActions
const { getCurrentUploads } = stemsUploadSelectors
const { getUser } = cacheUsersSelectors
const { getTrack } = cacheTracksSelectors
const setDominantColors = averageColorActions.setDominantColors
const { getAccountUser, getUserId, getUserHandle } = accountSelectors

function* fetchRepostInfo(entries: Entry<Collection>[]) {
  const userIds: ID[] = []
  entries.forEach((entry) => {
    if (entry.metadata.followee_reposts) {
      entry.metadata.followee_reposts.forEach((repost) =>
        userIds.push(repost.user_id)
      )
    }
  })

  if (userIds.length) {
    yield* call(fetchUsers, userIds)
  }
}

function* watchAdd() {
  yield* takeEvery(
    cacheActions.ADD_SUCCEEDED,
    function* (action: ReturnType<typeof cacheActions.addSucceeded>) {
      // This code only applies to tracks
      if (action.kind !== Kind.TRACKS) return

      // Fetch repost data
      const isNativeMobile = yield* getContext('isNativeMobile')
      if (!isNativeMobile) {
        yield* fork(fetchRepostInfo, action.entries as Entry<Collection>[])
      }

      // Prefetch stream urls
      const getFeatureEnabled = yield* getContext('getFeatureEnabled')
      const isPrefetchEnabled = yield* call(
        getFeatureEnabled,
        FeatureFlags.PREFETCH_STREAM_URLS
      )
      if (isPrefetchEnabled) {
        yield* fork(fetchTrackStreamUrls, {
          trackIds: action.entries.map((e) => e.id)
        })
      }
    }
  )
}

function* watchCacheUpdate() {
  yield* takeEvery(
    cacheActions.UPDATE,
    function* (action: ReturnType<typeof cacheActions.update>) {
      const getFeatureEnabled = yield* getContext('getFeatureEnabled')
      const isStreamPrefetchEnabled = yield* call(
        getFeatureEnabled,
        FeatureFlags.PREFETCH_STREAM_URLS
      )
      if (!isStreamPrefetchEnabled) return

      if (action.kind === Kind.TRACKS) {
        // Check for tracks with any changed access. If so we need to update the prefetched stream url
        const tracksWithChangedAccess = action.entries
          .filter((track) => track?.metadata?.access?.stream !== undefined)
          .map((track) => track.id)
        // Re-trigger prefetching stream urls for any changed tracks
        if (tracksWithChangedAccess.length > 0) {
          yield* fork(fetchTrackStreamUrls, {
            trackIds: tracksWithChangedAccess,
            isUpdate: true
          })
        }
      }
    }
  )
}

type TrackWithRemix = Pick<Track, 'track_id' | 'title'> & {
  remix_of: { tracks: Pick<Remix, 'parent_track_id'>[] } | null
}

export function* trackNewRemixEvent(track: TrackWithRemix) {
  yield* waitForAccount()
  const account = yield* select(getAccountUser)
  if (!track.remix_of || !account) return
  const remixParentTrack = track.remix_of.tracks[0]
  const parentTrack = yield* select(getTrack, {
    id: remixParentTrack.parent_track_id
  })
  const parentTrackUser = parentTrack
    ? yield* select(getUser, { id: parentTrack.owner_id })
    : null
  yield* put(
    make(Name.REMIX_NEW_REMIX, {
      id: track.track_id,
      handle: account.handle,
      title: track.title,
      parent_track_id: remixParentTrack.parent_track_id,
      parent_track_title: parentTrack ? parentTrack.title : '',
      parent_track_user_handle: parentTrackUser ? parentTrackUser.handle : ''
    })
  )
}

function* editTrackAsync(action: ReturnType<typeof trackActions.editTrack>) {
  yield* call(waitForWrite)
  action.formFields.description = squashNewLines(action.formFields.description)

  const currentTrack = yield* select(getTrack, { id: action.trackId })
  if (!currentTrack) return
  const isPublishing = currentTrack._is_publishing
  const wasUnlisted = currentTrack.is_unlisted
  const isNowListed = !action.formFields.is_unlisted

  if (!isPublishing && wasUnlisted && isNowListed) {
    yield* put(
      cacheActions.update(Kind.TRACKS, [
        {
          id: action.trackId,
          metadata: { _is_publishing: true }
        }
      ])
    )
  }

  const trackForEdit = yield* addPremiumMetadata(action.formFields)

  // Format musical key
  trackForEdit.musical_key = formatMusicalKey(
    trackForEdit.musical_key || undefined
  )

  // Format bpm
  trackForEdit.bpm = trackForEdit.bpm ? Number(trackForEdit.bpm) : undefined

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
  if (track.artwork?.file) {
    track._cover_art_sizes = {
      ...track._cover_art_sizes,
      [DefaultSizes.OVERRIDE]: track.artwork.url
    }
  }

  if (track.stems) {
    const inProgressStemUploads = yield* select(
      getCurrentUploads,
      track.track_id
    )
    const existingStems = currentTrack._stems || []

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

  yield* put(
    cacheActions.update(Kind.TRACKS, [{ id: track.track_id, metadata: track }])
  )
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
  formFields: TrackMetadata,
  wasUnlisted: boolean,
  isNowListed: boolean,
  currentTrack: Track
) {
  yield* waitForWrite()
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const apiClient = yield* getContext('apiClient')
  const transcodePreview =
    formFields.preview_start_seconds !== null &&
    formFields.preview_start_seconds !== undefined &&
    currentTrack.preview_start_seconds !== formFields.preview_start_seconds

  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.TRACKS, trackId),
      function* () {
        const { blockHash, blockNumber } = yield* call(
          audiusBackendInstance.updateTrack,
          trackId,
          { ...formFields },
          transcodePreview
        )

        const confirmed = yield* call(
          confirmTransaction,
          blockHash,
          blockNumber
        )
        if (!confirmed) {
          throw new Error(
            `Could not confirm edit track for track id ${trackId}`
          )
        }

        yield* waitForAccount()
        // Need to poll with the new track name in case it changed
        const userId = yield* select(getUserId)
        const handle = yield* select(getUserHandle)

        return yield* call(
          [apiClient, apiClient.getTrack],
          {
            id: trackId,
            currentUserId: userId,
            unlistedArgs: {
              urlTitle: formatUrlName(formFields.title),
              handle: handle!
            }
          },
          /* retry */ false
        )
      },
      function* (confirmedTrack: TrackMetadataForUpload & Track) {
        if (wasUnlisted && isNowListed) {
          confirmedTrack._is_publishing = false
        }
        // Update the cached track so it no longer contains image upload artifacts
        const { artwork: ignoredArtwork, ...metadata } = confirmedTrack
        yield* put(
          cacheActions.update(Kind.TRACKS, [
            {
              id: confirmedTrack.track_id,
              metadata
            }
          ])
        )
        yield* call(recordEditTrackAnalytics, currentTrack, confirmedTrack)
      },
      function* () {
        yield* put(trackActions.editTrackFailed())
        // Throw so the user can't capture a bad upload state (especially for downloads).
        // TODO: Consider better update revesion logic here coupled with a toast or similar.
        throw new Error('Edit track failed')
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
  const user = yield* select(getAccountUser)
  if (!user) {
    yield* put(signOnActions.openSignOn(false))
    return
  }
  const userId = user.user_id

  const track = yield* select(getTrack, { id: action.trackId })
  if (!track) return

  // Before deleting, check if the track is set as the artist pick & delete if so
  if (user.artist_pick_track_id === action.trackId) {
    yield* put(
      cacheActions.update(Kind.USERS, [
        {
          id: userId,
          metadata: {
            artist_pick_track_id: null
          }
        }
      ])
    )
    const user = yield* call(waitForValue, getUser, { id: userId })
    yield* fork(updateProfileAsync, { metadata: user })
  }

  yield* put(
    cacheActions.update(Kind.TRACKS, [
      { id: track.track_id, metadata: { _marked_deleted: true } }
    ])
  )

  yield* call(confirmDeleteTrack, track.track_id)
}

function* confirmDeleteTrack(trackId: ID) {
  yield* waitForWrite()
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const apiClient = yield* getContext('apiClient')
  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.TRACKS, trackId),
      function* () {
        const { blockHash, blockNumber } = yield* call(
          audiusBackendInstance.deleteTrack,
          trackId
        )

        const confirmed = yield* call(
          confirmTransaction,
          blockHash,
          blockNumber
        )
        if (!confirmed) {
          throw new Error(
            `Could not confirm delete track for track id ${trackId}`
          )
        }

        const track = yield* select(getTrack, { id: trackId })
        const handle = yield* select(getUserHandle)
        yield* waitForAccount()
        const userId = yield* select(getUserId)

        if (!track) return
        return yield* call(
          [apiClient, apiClient.getTrack],
          {
            id: trackId,
            currentUserId: userId,
            unlistedArgs: {
              urlTitle: formatUrlName(track.title),
              handle: handle!
            }
          },
          /* retry */ false
        )
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
        if (deletedTrack.stem_of) {
          const stemDeleteEvent = make(Name.STEM_DELETE, {
            id: deletedTrack.track_id,
            parent_track_id: deletedTrack.stem_of.parent_track_id,
            category: deletedTrack.stem_of.category
          })
          yield* put(stemDeleteEvent)
        }
      },
      function* () {
        // On failure, do not mark the track as deleted
        yield* put(
          cacheActions.update(Kind.TRACKS, [
            { id: trackId, metadata: { _marked_deleted: false } }
          ])
        )
      }
    )
  )
}

function* watchDeleteTrack() {
  yield* takeEvery(trackActions.DELETE_TRACK, deleteTrackAsync)
}

function* watchFetchCoverArt() {
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const isNativeMobile = yield* getContext('isNativeMobile')

  const inProgress = new Set()
  yield* takeEvery(
    trackActions.FETCH_COVER_ART,
    function* ({
      trackId,
      size
    }: ReturnType<typeof trackActions.fetchCoverArt>) {
      // Unique on id and size
      const key = `${trackId}-${size}`
      if (inProgress.has(key)) return
      inProgress.add(key)

      try {
        let track: Track | null = yield* call(waitForValue, getTrack, {
          id: trackId
        })
        const user = yield* call(waitForValue, getUser, { id: track!.owner_id })
        if (!track || !user || (!track.cover_art_sizes && !track.cover_art))
          return
        const multihash = track.cover_art_sizes || track.cover_art
        const coverArtSize = multihash === track.cover_art_sizes ? size : null
        const url = yield* call(
          audiusBackendInstance.getImageUrl,
          multihash,
          coverArtSize ?? undefined,
          track.cover_art_cids
        )
        track = yield* select(getTrack, { id: trackId })
        if (!track) return
        track._cover_art_sizes = {
          ...track._cover_art_sizes,
          [coverArtSize || DefaultSizes.OVERRIDE]: url
        }
        yield* put(
          cacheActions.update(Kind.TRACKS, [{ id: trackId, metadata: track }])
        )

        let smallImageUrl = url
        if (coverArtSize !== SquareSizes.SIZE_150_BY_150) {
          smallImageUrl = yield* call(
            audiusBackendInstance.getImageUrl,
            multihash,
            SquareSizes.SIZE_150_BY_150
          )
        }

        if (!isNativeMobile) {
          // Disabling dominant color fetch on mobile because it requires WebWorker
          // Can revisit this when doing glass morphism on NowPlaying
          const dominantColors = yield* call(dominantColor, smallImageUrl)

          if (!multihash) return
          yield* put(
            setDominantColors({
              multihash,
              colors: dominantColors
            })
          )
        }
      } catch (e) {
        console.error(`Unable to fetch cover art for track ${trackId}`)
      } finally {
        inProgress.delete(key)
      }
    }
  )
}

const sagas = () => {
  return [
    watchAdd,
    watchEditTrack,
    watchDeleteTrack,
    watchFetchCoverArt,
    watchCacheUpdate
  ]
}

export default sagas
