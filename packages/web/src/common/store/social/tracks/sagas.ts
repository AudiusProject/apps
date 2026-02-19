import {
  getUserQueryKey,
  queryAccountUser,
  queryTrack,
  queryUser,
  selectIsGuestAccount,
  updateTrackData
} from '@audius/common/api'
import { Name, Kind, ID, Track, User } from '@audius/common/models'
import {
  accountActions,
  tracksSocialActions as socialActions,
  getContext,
  gatedContentSelectors,
  confirmerActions,
  modalsActions,
  getSDK
} from '@audius/common/store'
import {
  formatShareText,
  makeKindId,
  removeNullable,
  getFilename
} from '@audius/common/utils'
import { Id, OptionalId } from '@audius/sdk'
import {
  call,
  select,
  takeEvery,
  put,
  fork,
  take,
  cancel
} from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'
import * as signOnActions from 'common/store/pages/signon/actions'
import { updateProfileAsync } from 'common/store/profile/sagas'
import { waitForRead, waitForWrite } from 'utils/sagaHelpers'

import watchTrackErrors from './errorSagas'
import { watchRecordListen } from './recordListen'
const { getNftAccessSignatureMap } = gatedContentSelectors
const { incrementTrackSaveCount, decrementTrackSaveCount } = accountActions
const { setVisibility } = modalsActions

/* REPOST TRACK */
export function* watchRepostTrack() {
  yield* takeEvery(socialActions.REPOST_TRACK, repostTrackAsync)
}

export function* repostTrackAsync(
  action: ReturnType<typeof socialActions.repostTrack>
) {
  yield* call(waitForWrite)
  const queryClient = yield* getContext('queryClient')
  const accountUser = yield* queryAccountUser()
  const { user_id: userId } = accountUser ?? {}
  const isGuest = yield* call(selectIsGuestAccount, accountUser)
  if (!userId || isGuest) {
    yield* put(signOnActions.openSignOn(false))
    yield* put(signOnActions.showRequiresAccountToast())
    yield* put(make(Name.CREATE_ACCOUNT_OPEN, { source: 'social action' }))
    return
  }

  // Increment the repost count on the user
  const user = yield* queryUser(userId)
  if (!user) return

  const track = yield* queryTrack(action.trackId)
  if (!track) return

  if (track.owner_id === userId) {
    return
  }

  queryClient.setQueryData(getUserQueryKey(user.user_id), (prevUser) =>
    !prevUser
      ? undefined
      : {
          ...prevUser,
          repost_count: prevUser.repost_count + 1
        }
  )

  const event = make(Name.REPOST, {
    kind: 'track',
    source: action.source,
    id: action.trackId
  })
  yield* put(event)

  const repostMetadata = action.isFeed
    ? // If we're on the feed, and someone i follow has
      // reposted the content i am reposting,
      // is_repost_of_repost is true
      { is_repost_of_repost: track.followee_reposts.length !== 0 }
    : { is_repost_of_repost: false }
  yield* call(confirmRepostTrack, action.trackId, user, repostMetadata)

  const eagerlyUpdatedMetadata: Partial<Track> = {
    has_current_user_reposted: true,
    repost_count: track.repost_count + 1
  }

  const remixTrack = track.remix_of?.tracks?.[0]
  const isCoSign = remixTrack?.user?.user_id === userId

  if (remixTrack && isCoSign) {
    // This repost is a co-sign
    const remixOf = {
      tracks: [
        {
          ...remixTrack,
          has_remix_author_reposted: true
        }
      ]
    }
    eagerlyUpdatedMetadata.remix_of = remixOf
    eagerlyUpdatedMetadata._co_sign = remixOf.tracks[0]
  }

  yield* call(updateTrackData, [
    { track_id: action.trackId, ...eagerlyUpdatedMetadata }
  ])

  if (remixTrack && isCoSign) {
    const {
      parent_track_id,
      has_remix_author_reposted,
      has_remix_author_saved
    } = remixTrack

    // Track Cosign Event
    const hasAlreadyCoSigned =
      has_remix_author_reposted || has_remix_author_saved

    const parentTrack = yield* queryTrack(parent_track_id)

    if (parentTrack) {
      const coSignIndicatorEvent = make(Name.REMIX_COSIGN_INDICATOR, {
        id: action.trackId,
        handle: user.handle,
        original_track_id: parentTrack.track_id,
        original_track_title: parentTrack.title,
        action: 'reposted'
      })
      yield* put(coSignIndicatorEvent)

      if (!hasAlreadyCoSigned) {
        const coSignEvent = make(Name.REMIX_COSIGN, {
          id: action.trackId,
          handle: user.handle,
          original_track_id: parentTrack.track_id,
          original_track_title: parentTrack.title,
          action: 'reposted'
        })
        yield* put(coSignEvent)
      }
    }
  }
}

export function* confirmRepostTrack(
  trackId: ID,
  user: User,
  metadata?: { is_repost_of_repost: boolean }
) {
  const sdk = yield* getSDK()
  const queryClient = yield* getContext('queryClient')

  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.TRACKS, trackId),
      function* () {
        yield* call([sdk.tracks, sdk.tracks.repostTrack], {
          trackId: Id.parse(trackId),
          userId: Id.parse(user.user_id)
        })

        return trackId
      },
      function* () {},
      // @ts-ignore: remove when confirmer is typed
      function* ({ timeout, message }: { timeout: boolean; message: string }) {
        // Revert the incremented repost count
        queryClient.setQueryData(getUserQueryKey(user.user_id), (prevUser) =>
          !prevUser
            ? undefined
            : {
                ...prevUser,
                repost_count: prevUser.repost_count - 1
              }
        )
        yield* put(
          socialActions.trackRepostFailed(
            trackId,
            timeout ? 'Timeout' : message
          )
        )
      }
    )
  )
}

export function* watchUndoRepostTrack() {
  yield* takeEvery(socialActions.UNDO_REPOST_TRACK, undoRepostTrackAsync)
}

export function* undoRepostTrackAsync(
  action: ReturnType<typeof socialActions.undoRepostTrack>
) {
  yield* call(waitForWrite)
  const queryClient = yield* getContext('queryClient')
  const accountUser = yield* queryAccountUser()
  const { user_id: userId } = accountUser ?? {}
  const isGuest = yield* call(selectIsGuestAccount, accountUser)
  if (!userId || isGuest) {
    yield* put(signOnActions.openSignOn(false))
    yield* put(signOnActions.showRequiresAccountToast())
    yield* put(make(Name.CREATE_ACCOUNT_OPEN, { source: 'social action' }))
    return
  }

  // Decrement the repost count
  const user = yield* queryUser(userId)
  if (!user) return

  queryClient.setQueryData(getUserQueryKey(user.user_id), (prevUser) =>
    !prevUser
      ? undefined
      : {
          ...prevUser,
          repost_count: prevUser.repost_count - 1
        }
  )

  const event = make(Name.UNDO_REPOST, {
    kind: 'track',
    source: action.source,
    id: action.trackId
  })
  yield* put(event)

  yield* call(confirmUndoRepostTrack, action.trackId, user)

  const track = yield* queryTrack(action.trackId)
  if (!track) return

  const eagerlyUpdatedMetadata: Partial<Track> = {
    has_current_user_reposted: false,
    repost_count: track.repost_count - 1
  }

  if (track.remix_of?.tracks?.[0]?.user?.user_id === userId) {
    // This repost is a co-sign
    const remixOf = {
      tracks: [
        {
          ...track.remix_of.tracks[0],
          has_remix_author_reposted: false
        }
      ]
    }
    eagerlyUpdatedMetadata.remix_of = remixOf
    if (
      remixOf.tracks[0].has_remix_author_saved ||
      remixOf.tracks[0].has_remix_author_reposted
    ) {
      eagerlyUpdatedMetadata._co_sign = remixOf.tracks[0]
    } else {
      eagerlyUpdatedMetadata._co_sign = null
    }
  }

  yield* call(updateTrackData, [
    { track_id: action.trackId, ...eagerlyUpdatedMetadata }
  ])
}

export function* confirmUndoRepostTrack(trackId: ID, user: User) {
  const sdk = yield* getSDK()
  const queryClient = yield* getContext('queryClient')
  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.TRACKS, trackId),
      function* () {
        yield* call([sdk.tracks, sdk.tracks.unrepostTrack], {
          trackId: Id.parse(trackId),
          userId: Id.parse(user.user_id)
        })

        return trackId
      },
      function* () {},
      // @ts-ignore: remove when confirmer is typed
      function* ({ timeout, message }: { timeout: boolean; message: string }) {
        // revert the decremented repost count
        queryClient.setQueryData(getUserQueryKey(user.user_id), (prevUser) =>
          !prevUser
            ? undefined
            : {
                ...prevUser,
                repost_count: prevUser.repost_count + 1
              }
        )
        yield* put(
          socialActions.trackRepostFailed(
            trackId,
            timeout ? 'Timeout' : message
          )
        )
      }
    )
  )
}
/* SAVE TRACK */

export function* watchSaveTrack() {
  yield* takeEvery(socialActions.SAVE_TRACK, saveTrackAsync)
}

export function* saveTrackAsync(
  action: ReturnType<typeof socialActions.saveTrack>
) {
  yield* call(waitForWrite)
  const accountUser = yield* queryAccountUser()
  const { user_id: userId } = accountUser ?? {}
  const isGuest = yield* call(selectIsGuestAccount, accountUser)
  if (!userId || isGuest) {
    yield* put(signOnActions.showRequiresAccountToast())
    yield* put(signOnActions.openSignOn(false))
    yield* put(make(Name.CREATE_ACCOUNT_OPEN, { source: 'social action' }))
    return
  }
  const track = yield* queryTrack(action.trackId)
  if (!track) return

  if (track.has_current_user_saved) return

  // Increment the save count on the user
  const user = yield* queryUser(userId)
  if (!user) return

  if (track.owner_id === userId) {
    return
  }

  yield* put(incrementTrackSaveCount())

  const event = make(Name.FAVORITE, {
    kind: 'track',
    source: action.source,
    id: action.trackId
  })
  yield* put(event)

  const saveMetadata = action.isFeed
    ? // If we're on the feed, and the content
      // being saved is a repost
      { is_save_of_repost: track.followee_reposts.length !== 0 }
    : { is_save_of_repost: false }
  yield* call(confirmSaveTrack, action.trackId, user, saveMetadata)

  const eagerlyUpdatedMetadata: Partial<Track> = {
    has_current_user_saved: true,
    save_count: track.save_count + 1
  }

  const remixTrack = track.remix_of?.tracks?.[0]
  const isCoSign = remixTrack?.user?.user_id === userId
  if (remixTrack && isCoSign) {
    // This repost is a co-sign
    const remixOf = {
      tracks: [
        {
          ...remixTrack,
          has_remix_author_saved: true
        }
      ]
    }
    eagerlyUpdatedMetadata.remix_of = remixOf
    eagerlyUpdatedMetadata._co_sign = remixOf.tracks[0]
  }

  yield* call(updateTrackData, [
    { track_id: action.trackId, ...eagerlyUpdatedMetadata }
  ])
  yield* put(socialActions.saveTrackSucceeded(action.trackId))
  if (isCoSign) {
    // Track Cosign Event
    const parentTrackId = remixTrack.parent_track_id
    const hasAlreadyCoSigned =
      remixTrack.has_remix_author_reposted || remixTrack.has_remix_author_saved

    const parentTrack = yield* queryTrack(parentTrackId)
    const accountUser = yield* call(queryAccountUser)
    const handle = accountUser?.handle
    const coSignIndicatorEvent = make(Name.REMIX_COSIGN_INDICATOR, {
      id: action.trackId,
      handle,
      original_track_id: parentTrack?.track_id,
      original_track_title: parentTrack?.title,
      action: 'favorited'
    })
    yield* put(coSignIndicatorEvent)

    if (!hasAlreadyCoSigned) {
      const coSignEvent = make(Name.REMIX_COSIGN, {
        id: action.trackId,
        handle,
        original_track_id: parentTrack?.track_id,
        original_track_title: parentTrack?.title,
        action: 'favorited'
      })
      yield* put(coSignEvent)
    }
  }
}

export function* confirmSaveTrack(
  trackId: ID,
  user: User,
  metadata?: { is_save_of_repost: boolean }
) {
  const sdk = yield* getSDK()
  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.TRACKS, trackId),
      function* () {
        yield* call([sdk.tracks, sdk.tracks.favoriteTrack], {
          userId: Id.parse(user.user_id),
          trackId: Id.parse(trackId)
        })

        return trackId
      },
      function* () {},
      // @ts-ignore: remove when confirmer is typed
      function* ({ timeout, message }: { timeout: boolean; message: string }) {
        // Revert the incremented save count
        yield* put(decrementTrackSaveCount())

        yield* put(
          socialActions.saveTrackFailed(trackId, timeout ? 'Timeout' : message)
        )
      }
    )
  )
}

export function* watchUnsaveTrack() {
  yield* takeEvery(socialActions.UNSAVE_TRACK, unsaveTrackAsync)
}

export function* unsaveTrackAsync(
  action: ReturnType<typeof socialActions.unsaveTrack>
) {
  yield* call(waitForWrite)
  const accountUser = yield* queryAccountUser()
  const { user_id: userId } = accountUser ?? {}
  const isGuest = yield* call(selectIsGuestAccount, accountUser)
  if (!userId || isGuest) {
    yield* put(signOnActions.openSignOn(false))
    yield* put(signOnActions.showRequiresAccountToast())
    yield* put(make(Name.CREATE_ACCOUNT_OPEN, { source: 'social action' }))
    return
  }

  // Decrement the save count
  const user = yield* queryUser(userId)
  if (!user) return

  yield* put(decrementTrackSaveCount())

  const event = make(Name.UNFAVORITE, {
    kind: 'track',
    source: action.source,
    id: action.trackId
  })
  yield* put(event)

  yield* call(confirmUnsaveTrack, action.trackId, user)

  const track = yield* queryTrack(action.trackId)
  if (!track) return

  if (track) {
    const eagerlyUpdatedMetadata: Partial<Track> = {
      has_current_user_saved: false,
      save_count: track.save_count - 1
    }

    if (track.remix_of?.tracks?.[0]?.user?.user_id === userId) {
      // This save is a co-sign
      const remixOf = {
        tracks: [
          {
            ...track.remix_of.tracks[0],
            has_remix_author_saved: false
          }
        ]
      }
      eagerlyUpdatedMetadata.remix_of = remixOf
      if (
        remixOf.tracks[0].has_remix_author_saved ||
        remixOf.tracks[0].has_remix_author_reposted
      ) {
        eagerlyUpdatedMetadata._co_sign = remixOf.tracks[0]
      } else {
        eagerlyUpdatedMetadata._co_sign = null
      }
    }

    yield* call(updateTrackData, [
      { track_id: action.trackId, ...eagerlyUpdatedMetadata }
    ])
  }

  yield* put(socialActions.unsaveTrackSucceeded(action.trackId))
}

export function* confirmUnsaveTrack(trackId: ID, user: User) {
  const sdk = yield* getSDK()
  yield* put(
    confirmerActions.requestConfirmation(
      makeKindId(Kind.TRACKS, trackId),
      function* () {
        yield* call([sdk.tracks, sdk.tracks.unfavoriteTrack], {
          userId: Id.parse(user.user_id),
          trackId: Id.parse(trackId)
        })
        return trackId
      },
      function* () {},
      // @ts-ignore: remove when confirmer is typed
      function* ({ timeout, message }: { timeout: boolean; message: string }) {
        // revert the decremented save count
        yield* put(incrementTrackSaveCount())
        yield* put(
          socialActions.unsaveTrackFailed(
            trackId,
            timeout ? 'Timeout' : message
          )
        )
      }
    )
  )
}

export function* watchSetArtistPick() {
  yield* takeEvery(
    socialActions.SET_ARTIST_PICK,
    function* (action: ReturnType<typeof socialActions.setArtistPick>) {
      yield* call(waitForWrite)
      const queryClient = yield* getContext('queryClient')
      const accountUser = yield* queryAccountUser()
      const { user_id: userId } = accountUser ?? {}

      if (!userId) return

      queryClient.setQueryData(getUserQueryKey(userId), (prevUser) =>
        !prevUser
          ? undefined
          : {
              ...prevUser,
              artist_pick_track_id: action.trackId
            }
      )
      const user = yield* call(queryUser, userId)
      yield* fork(updateProfileAsync, { metadata: user })

      const event = make(Name.ARTIST_PICK_SELECT_TRACK, { id: action.trackId })
      yield* put(event)
    }
  )
}

export function* watchUnsetArtistPick() {
  yield* takeEvery(socialActions.UNSET_ARTIST_PICK, function* (action) {
    yield* call(waitForWrite)
    const queryClient = yield* getContext('queryClient')
    const accountUser = yield* queryAccountUser()
    const { user_id: userId } = accountUser ?? {}

    if (!userId) return
    queryClient.setQueryData(getUserQueryKey(userId), (prevUser) =>
      !prevUser
        ? undefined
        : {
            ...prevUser,
            artist_pick_track_id: null
          }
    )
    const user = yield* call(queryUser, userId)
    yield* fork(updateProfileAsync, { metadata: user })

    const event = make(Name.ARTIST_PICK_SELECT_TRACK, { id: 'none' })
    yield* put(event)
  })
}

/**
 * Downloads all tracks in the given quality. Can be used for a single
 * track or multiple tracks (usually for stems). First track is the parent track.
 */
function* downloadTracks({
  tracks,
  original,
  rootDirectoryName,
  abortSignal
}: {
  tracks: { trackId: ID; filename: string }[]
  original?: boolean
  rootDirectoryName?: string
  abortSignal?: AbortSignal
  userId?: ID
}) {
  const { trackId: parentTrackId } = tracks[0]

  try {
    const audiusSdk = yield* getContext('audiusSdk')
    const sdk = yield* call(audiusSdk)
    const dispatch = yield* getContext('dispatch')
    const audiusBackend = yield* getContext('audiusBackendInstance')
    const trackDownload = yield* getContext('trackDownload')

    const nftAccessSignatureMap = yield* select(getNftAccessSignatureMap)
    const accountUser = yield* queryAccountUser()
    const { user_id: userId } = accountUser ?? {}
    const { data, signature } = yield* call(
      audiusBackend.signGatedContentRequest,
      { sdk }
    )
    const nftAccessSignature = original
      ? (nftAccessSignatureMap[parentTrackId]?.original ?? null)
      : (nftAccessSignatureMap[parentTrackId]?.mp3 ?? null)

    yield* call(async () => {
      const files = await Promise.all(
        tracks.map(async ({ trackId, filename }) => {
          const url = await sdk.tracks.getTrackDownloadUrl({
            trackId: Id.parse(trackId),
            userId: OptionalId.parse(userId),
            userSignature: signature,
            userData: data,
            nftAccessSignature: nftAccessSignature
              ? JSON.stringify(nftAccessSignature)
              : undefined
          })
          return {
            url,
            filename
          }
        })
      )

      await trackDownload.downloadTracks({
        files,
        rootDirectoryName,
        abortSignal,
        dispatch
      })
    })

    yield* call(async () => {
      await Promise.all(
        tracks.map(async ({ trackId }) => {
          try {
            await sdk.tracks.recordTrackDownload({
              userId: OptionalId.parse(userId),
              trackId: Id.parse(trackId)
            })
            console.debug('Recorded download for track', trackId)
          } catch (e) {
            console.error('Failed to record download for track', trackId, e)
          }
        })
      )
    })
  } catch (e) {
    console.error(
      `Could not download files for track ${parentTrackId}: ${
        (e as Error).message
      }. Error: ${e}`
    )
  }
}

function* watchDownloadTrack() {
  yield* takeEvery(
    socialActions.DOWNLOAD_TRACK,
    function* (action: ReturnType<typeof socialActions.downloadTrack>) {
      const controller = new AbortController()
      const task = yield* fork(function* () {
        const { trackIds, parentTrackId, original } = action
        yield* call(waitForRead)

        // Make sure we have an account before proceeding
        yield* queryAccountUser()

        const mainTrackId = parentTrackId ?? trackIds[0]
        const mainTrack = yield* queryTrack(mainTrackId)
        if (!mainTrack) {
          console.error(
            `Failed to download because no mainTrack ${mainTrackId}`
          )
          return
        }
        const userId = mainTrack?.owner_id
        const user = yield* queryUser(userId)
        if (!user) {
          console.error(`Failed to download because no user ${userId}`)
          return
        }
        const rootDirectoryName = `${user.name} - ${mainTrack.title} (Audius)`
        // Mobile typecheck complains if this array isn't typed
        const tracks: { trackId: ID; filename: string }[] = []

        for (const trackId of [...trackIds, parentTrackId].filter(
          removeNullable
        )) {
          const track = yield* queryTrack(trackId)
          if (!track) {
            console.error(
              `Skipping individual download because no track ${trackId}`
            )
            return
          }

          tracks.push({
            trackId,
            filename: getFilename({
              track,
              user,
              isOriginal: original,
              isDownload: true
            })
          })
        }

        yield* call(downloadTracks, {
          tracks,
          original,
          rootDirectoryName,
          abortSignal: controller.signal
        })
      })
      yield* take(socialActions.CANCEL_DOWNLOAD)
      controller.abort()
      yield* cancel(task)
    }
  )
}

function* watchDownloadFinished() {
  yield* takeEvery(
    socialActions.DOWNLOAD_FINISHED,
    function* (action: ReturnType<typeof socialActions.downloadFinished>) {
      yield* put(
        setVisibility({ modal: 'WaitForDownloadModal', visible: false })
      )
    }
  )
}

/* SHARE */

function* watchShareTrack() {
  yield* takeEvery(
    socialActions.SHARE_TRACK,
    function* (action: ReturnType<typeof socialActions.shareTrack>) {
      const { trackId } = action

      const track = yield* queryTrack(trackId)
      if (!track) return

      const user = yield* queryUser(track.owner_id)
      if (!user) return

      const link = track.permalink
      const share = yield* getContext('share')
      share(link, formatShareText(track.title, user.name))

      const event = make(Name.SHARE, {
        kind: 'track',
        source: action.source,
        id: trackId,
        url: link
      })
      yield* put(event)
    }
  )
}

const sagas = () => {
  return [
    watchRepostTrack,
    watchUndoRepostTrack,
    watchSaveTrack,
    watchUnsaveTrack,
    watchRecordListen,
    watchSetArtistPick,
    watchUnsetArtistPick,
    watchDownloadTrack,
    watchDownloadFinished,
    watchShareTrack,
    watchTrackErrors
  ]
}

export default sagas
