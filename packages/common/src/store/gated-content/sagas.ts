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
  isContentUSDCPurchaseGated,
  GatedContentStatus,
  UserTrackMetadata,
  UserCollectionMetadata
} from '~/models'
import { IntKeys } from '~/services/remote-config'
import { getContext } from '~/store/effects'
import { musicConfettiActions } from '~/store/music-confetti'
import { usersSocialActions } from '~/store/social'
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
  removeFolloweeId
} = gatedContentActions

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

  const isAlbum = contentType === PurchaseableContentType.ALBUM
  const cachedEntity = isAlbum
    ? yield* queryCollection(contentId)
    : yield* queryTrack(contentId)
  const initiallyHadNoStreamAccess = !cachedEntity?.access.stream
  const initiallyHadNoDownloadAccess = !cachedEntity?.access.download

  while (true) {
    const apiEntity = isAlbum
      ? yield* call(async () => {
          const { data = [] } = await sdk.playlists.getPlaylist({
            playlistId: Id.parse(contentId),
            userId: OptionalId.parse(currentUserId)
          })
          return transformAndCleanList(data, userCollectionMetadataFromSDK)[0]
        })
      : yield* call(async () => {
          const { data } = await sdk.tracks.getTrack({
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
      'playlist_owner_id' in apiEntity
        ? apiEntity.playlist_owner_id
        : apiEntity.owner_id

    const currentlyHasStreamAccess = !!apiEntity.access.stream
    const currentlyHasDownloadAccess = !!apiEntity.access.download

    if (isAlbum) {
      yield* call(updateCollectionData, [apiEntity as UserCollectionMetadata])
    } else {
      yield* call(updateTrackData, [apiEntity as UserTrackMetadata])
    }
    if (initiallyHadNoStreamAccess && currentlyHasStreamAccess) {
      yield* put(updateGatedContentStatus({ contentId, status: 'UNLOCKED' }))
      yield* put(removeFolloweeId({ id: ownerId }))

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
      yield* put(removeFolloweeId({ id: ownerId }))

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

function* updateFollowGatedTracks(
  trackOwnerId: ID,
  sourceTrackId?: Nullable<ID>
) {
  const currentUser = yield* call(queryAccountUser)
  const currentUserId = currentUser?.user_id
  if (!currentUserId) return

  yield* put(addFolloweeId({ id: trackOwnerId }))

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
    const isTrackStreamGated = isContentFollowGated(streamConditions)
    const isTrackDownloadGated = isContentFollowGated(downloadConditions)
    if (isTrackStreamGated && ownerId === trackOwnerId) {
      statusMap[id] = 'UNLOCKING'
      tracksToPoll.add(id)
    } else if (isTrackDownloadGated && ownerId === trackOwnerId) {
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

function* handleUnfollowUser(
  action: ReturnType<typeof usersSocialActions.unfollowUser>
) {
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
      revokeAccessMap[id] = 'stream'
    } else if (isDownloadFollowGated && ownerId === action.userId) {
      revokeAccessMap[id] = 'download'
    }
  })

  yield* put(updateGatedContentStatuses(statusMap))
  yield* put(revokeAccess({ revokeAccessMap }))
}

function* handleFollowUser(
  action: ReturnType<typeof usersSocialActions.followUser>
) {
  yield* call(updateFollowGatedTracks, action.userId, action.trackId)
}

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

function* watchRevokeAccess() {
  yield* takeEvery(revokeAccess.type, handleRevokeAccess)
}

export const sagas = () => {
  return [watchFollowGatedTracks, watchUnfollowGatedTracks, watchRevokeAccess]
}
