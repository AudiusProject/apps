import { Id, OptionalId } from '@audius/sdk'
import { takeEvery, call, put, delay, all } from 'typed-redux-saga'

import {
  transformAndCleanList,
  userCollectionMetadataFromSDK,
  userTrackMetadataFromSDK
} from '~/adapters'
import {
  queryCollection,
  queryTrack,
  queryAllTracks,
  queryAccountUser,
  updateTrackData,
  updateCollectionData
} from '~/api'
import {
  ID,
  Name,
  isContentFollowGated,
  isContentTipGated,
  isContentTokenGated,
  isContentUSDCPurchaseGated,
  GatedContentStatus,
  UserTrackMetadata,
  UserCollectionMetadata
} from '~/models'
import { IntKeys } from '~/services/remote-config'
import { getContext } from '~/store/effects'
import { musicConfettiActions } from '~/store/music-confetti'
import { usersSocialActions } from '~/store/social'
import { tippingActions } from '~/store/tipping'
import { Nullable } from '~/utils/typeUtils'

import { PurchaseableContentType } from '../purchase-content'
import { getSDK } from '../sdkUtils'

import { actions as gatedContentActions } from './slice'

const DEFAULT_GATED_TRACK_POLL_INTERVAL_MS = 1000

const {
  revokeAccess,
  updateGatedContentStatus,
  updateGatedContentStatuses,
  addFolloweeId,
  removeFolloweeId,
  addTippedUserId,
  removeTippedUserId
} = gatedContentActions

const { refreshTipGatedTracks } = tippingActions
const { show: showConfetti } = musicConfettiActions

export function* pollGatedContent({
  contentId,
  contentType,
  currentUserId,
  isSourceTrack
}: {
  contentId: ID
  contentType: PurchaseableContentType
  currentUserId: number
  isSourceTrack?: boolean
}) {
  const analytics = yield* getContext('analytics')
  const sdk = yield* getSDK()
  const remoteConfigInstance = yield* getContext('remoteConfigInstance')
  yield* call(remoteConfigInstance.waitForRemoteConfig)
  const frequency =
    remoteConfigInstance.getRemoteVar(IntKeys.GATED_TRACK_POLL_INTERVAL_MS) ??
    DEFAULT_GATED_TRACK_POLL_INTERVAL_MS

  // get initial track metadata to determine whether we are polling for stream or download access
  const isAlbum = contentType === PurchaseableContentType.ALBUM
  const cachedEntity = isAlbum
    ? yield* queryCollection(contentId)
    : yield* queryTrack(contentId)
  const initiallyHadNoStreamAccess = !cachedEntity?.access.stream
  const initiallyHadNoDownloadAccess = !cachedEntity?.access.download

  // poll for access until it is granted
  while (true) {
    const apiEntity = isAlbum
      ? yield* call(async () => {
          const { data = [] } = await sdk.full.playlists.getPlaylist({
            playlistId: Id.parse(contentId),
            userId: OptionalId.parse(currentUserId)
          })
          return transformAndCleanList(data, userCollectionMetadataFromSDK)[0]
        })
      : yield* call(async () => {
          const { data } = await sdk.full.tracks.getTrack({
            trackId: Id.parse(contentId),
            userId: OptionalId.parse(currentUserId)
          })
          return data ? userTrackMetadataFromSDK(data) : null
        })

    if (!apiEntity?.access) {
      throw new Error(
        `Could not retrieve entity with access for ${contentType} ${contentId}`
      )
    }

    const ownerId =
      'playlist_owner_id' in apiEntity // isAlbum
        ? apiEntity.playlist_owner_id
        : apiEntity.owner_id

    const currentlyHasStreamAccess = !!apiEntity.access.stream
    const currentlyHasDownloadAccess = !!apiEntity.access.download

    // Update the cache with the new metadata so that the UI
    // can update and the content can be streamed or downloaded properly.
    if (isAlbum) {
      yield* call(updateCollectionData, [apiEntity as UserCollectionMetadata])
    } else {
      yield* call(updateTrackData, [apiEntity as UserTrackMetadata])
    }
    if (initiallyHadNoStreamAccess && currentlyHasStreamAccess) {
      yield* put(updateGatedContentStatus({ contentId, status: 'UNLOCKED' }))
      // note: if necessary, update some ui status to show that the download is unlocked
      yield* put(removeFolloweeId({ id: ownerId }))
      yield* put(removeTippedUserId({ id: ownerId }))

      // Show confetti if track is unlocked from the how to unlock section on track/collection page or modal
      if (isSourceTrack) {
        yield* put(showConfetti())
      }

      if (!apiEntity.stream_conditions) {
        return
      }

      const getEventName = () => {
        if (isContentUSDCPurchaseGated(apiEntity.stream_conditions)) {
          return isAlbum
            ? Name.USDC_PURCHASE_GATED_COLLECTION_UNLOCKED
            : Name.USDC_PURCHASE_GATED_TRACK_UNLOCKED
        }
        if (isContentFollowGated(apiEntity.stream_conditions)) {
          return Name.FOLLOW_GATED_TRACK_UNLOCKED
        }
        if (isContentTipGated(apiEntity.stream_conditions)) {
          return Name.TIP_GATED_TRACK_UNLOCKED
        }
        if (isContentTokenGated(apiEntity.stream_conditions)) {
          return Name.TOKEN_GATED_TRACK_UNLOCKED
        }
        return null
      }
      const eventName = getEventName()
      if (eventName) {
        analytics.track({
          eventName,
          properties: {
            contentId
          }
        })
      }
      break
    } else if (initiallyHadNoDownloadAccess && currentlyHasDownloadAccess) {
      // note: if necessary, update some ui status to show that the track download is unlocked
      yield* put(removeFolloweeId({ id: ownerId }))

      // Show confetti if track is unlocked from the how to unlock section on track page or modal
      if (isSourceTrack) {
        yield* put(showConfetti())
      }

      if (
        !('download_conditions' in apiEntity) ||
        !apiEntity.download_conditions
      ) {
        return
      }
      const eventName =
        !isAlbum &&
        (isContentUSDCPurchaseGated(apiEntity.download_conditions)
          ? Name.USDC_PURCHASE_GATED_DOWNLOAD_TRACK_UNLOCKED
          : isContentFollowGated(apiEntity.download_conditions)
            ? Name.FOLLOW_GATED_DOWNLOAD_TRACK_UNLOCKED
            : isContentTokenGated(apiEntity.download_conditions)
              ? Name.TOKEN_GATED_DOWNLOAD_TRACK_UNLOCKED
              : null)
      if (eventName) {
        analytics.track({
          eventName,
          properties: {
            contentId
          }
        })
      }
      break
    }
    yield* delay(frequency)
  }
}

/**
 * 1. Get follow or tip gated tracks of user
 * 2. Set those track statuses to 'UNLOCKING'
 * 3. Poll for access for those tracks
 * 4. When access is returned, set those track statuses as 'UNLOCKED'
 */
function* updateSpecialAccessTracks(
  trackOwnerId: ID,
  gate: 'follow' | 'tip',
  sourceTrackId?: Nullable<ID>
) {
  const currentUser = yield* call(queryAccountUser)
  const currentUserId = currentUser?.user_id
  if (!currentUserId) return

  // Add followee or tipped user id to gated content store to subscribe to
  // polling their newly loaded gated track signatures.
  if (gate === 'follow') {
    yield* put(addFolloweeId({ id: trackOwnerId }))
  } else {
    yield* put(addTippedUserId({ id: trackOwnerId }))
  }

  const statusMap: { [id: ID]: GatedContentStatus } = {}
  const tracksToPoll: Set<ID> = new Set()
  const cachedTracks = yield* queryAllTracks()

  Object.keys(cachedTracks).forEach((trackId) => {
    const id = parseInt(trackId)
    const {
      owner_id: ownerId,
      stream_conditions: streamConditions,
      download_conditions: downloadConditions
    } = cachedTracks[id]
    const isTrackStreamGated =
      gate === 'follow'
        ? isContentFollowGated(streamConditions)
        : isContentTipGated(streamConditions)
    const isTrackDownloadGated =
      gate === 'follow'
        ? isContentFollowGated(downloadConditions)
        : isContentTipGated(downloadConditions)
    if (isTrackStreamGated && ownerId === trackOwnerId) {
      statusMap[id] = 'UNLOCKING'
      // note: if necessary, update some ui status to show that the track download is unlocking
      tracksToPoll.add(id)
    } else if (isTrackDownloadGated && ownerId === trackOwnerId) {
      // note: if necessary, update some ui status to show that the track download is unlocking
      tracksToPoll.add(id)
    }
  })

  yield* put(updateGatedContentStatuses(statusMap))

  yield* all(
    Array.from(tracksToPoll).map((trackId) => {
      return call(pollGatedContent, {
        contentId: trackId,
        contentType: PurchaseableContentType.TRACK,
        currentUserId,
        isSourceTrack: sourceTrackId === trackId
      })
    })
  )
}

/**
 * 1. Get follow-gated tracks of unfollowed user
 * 2. Set those track statuses to 'LOCKED'
 * 3. Revoke access for those tracks
 */
function* handleUnfollowUser(
  action: ReturnType<typeof usersSocialActions.unfollowUser>
) {
  // Remove followee from gated content store to unsubscribe from
  // polling their newly loaded follow gated track signatures.
  yield* put(removeFolloweeId({ id: action.userId }))

  const statusMap: { [id: ID]: GatedContentStatus } = {}
  const revokeAccessMap: { [id: ID]: 'stream' | 'download' } = {}
  const cachedTracks = yield* queryAllTracks()

  Object.keys(cachedTracks).forEach((trackId) => {
    const id = parseInt(trackId)
    const {
      owner_id: ownerId,
      stream_conditions: streamConditions,
      download_conditions: downloadConditions
    } = cachedTracks[id]
    const isStreamFollowGated = isContentFollowGated(streamConditions)
    const isDownloadFollowGated = isContentFollowGated(downloadConditions)
    if (isStreamFollowGated && ownerId === action.userId) {
      statusMap[id] = 'LOCKED'
      // note: if necessary, update some ui status to show that the track download is locked
      revokeAccessMap[id] = 'stream'
    } else if (isDownloadFollowGated && ownerId === action.userId) {
      // note: if necessary, update some ui status to show that the track download is locked
      revokeAccessMap[id] = 'download'
    }
  })

  yield* put(updateGatedContentStatuses(statusMap))
  yield* put(revokeAccess({ revokeAccessMap }))
}

function* handleFollowUser(
  action: ReturnType<typeof usersSocialActions.followUser>
) {
  yield* call(
    updateSpecialAccessTracks,
    action.userId,
    'follow',
    action.trackId
  )
}

function* handleTipGatedTracks(
  action: ReturnType<typeof refreshTipGatedTracks>
) {
  yield* call(
    updateSpecialAccessTracks,
    action.payload.userId,
    'tip',
    action.payload.trackId
  )
}

/**
 * Remove stream signatures from track metadata when they're
 * no longer accessible by the user.
 */
function* handleRevokeAccess(action: ReturnType<typeof revokeAccess>) {
  const { revokeAccessMap } = action.payload
  const metadatas = Object.keys(revokeAccessMap).map((trackId) => {
    const track_id = parseInt(trackId)
    const access =
      revokeAccessMap[track_id] === 'stream'
        ? { stream: false, download: false }
        : { stream: true, download: false }
    return { track_id, access }
  })
  yield* call(updateTrackData, metadatas)
}

function* watchFollowGatedTracks() {
  yield* takeEvery(usersSocialActions.FOLLOW_USER, handleFollowUser)
}

function* watchUnfollowGatedTracks() {
  yield* takeEvery(usersSocialActions.UNFOLLOW_USER, handleUnfollowUser)
}

function* watchTipGatedTracks() {
  yield* takeEvery(refreshTipGatedTracks.type, handleTipGatedTracks)
}

function* watchRevokeAccess() {
  yield* takeEvery(revokeAccess.type, handleRevokeAccess)
}

export const sagas = () => {
  return [
    watchFollowGatedTracks,
    watchUnfollowGatedTracks,
    watchTipGatedTracks,
    watchRevokeAccess
  ]
}
