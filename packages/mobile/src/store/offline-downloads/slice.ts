import type {
  OfflineCollectionMetadata,
  ID,
  OfflineTrackMetadata
} from '@audius/common/models'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NetInfoStateType } from '@react-native-community/netinfo'
import type { PayloadAction } from '@reduxjs/toolkit'
import { createSlice } from '@reduxjs/toolkit'
import { persistReducer } from 'redux-persist'

import type { DOWNLOAD_REASON_FAVORITES } from './constants'
import {
  addOfflineCollection,
  addOfflineTrack,
  removeOfflineCollection,
  removeOfflineTrack
} from './utils'

export type CollectionId = ID | typeof DOWNLOAD_REASON_FAVORITES

export type TrackOfflineMetadataPayload = {
  trackId: ID
  offlineMetadata: OfflineTrackMetadata
}
export type DownloadNetworkPreference = NetInfoStateType

export type OfflineJob =
  | { type: 'collection'; id: CollectionId }
  | { type: 'track'; id: ID; requeueCount?: number }
  | { type: 'collection-sync'; id: CollectionId }
  | { type: 'play-count'; id: ID }
  | { type: 'stale-track'; id: ID }

export type TrackStatus = {
  [Key in ID]?: OfflineDownloadStatus
}

export type CollectionStatus = {
  [Key in ID]?: OfflineDownloadStatus
}

export type OfflineDownloadsState = {
  trackStatus: TrackStatus
  collectionStatus: CollectionStatus
  collectionSyncStatus: {
    [Key in ID]?: CollectionSyncStatus
  }
  isDoneLoadingFromDisk: boolean
  offlineQueue: OfflineJob[]
  queueStatus: QueueStatus
  offlineTrackMetadata: Record<ID, OfflineTrackMetadata>
  offlineCollectionMetadata: {
    [Key in CollectionId]?: OfflineCollectionMetadata
  }
  preferredDownloadNetworkType: DownloadNetworkPreference
  currentNetworkType: NetInfoStateType
}

export type RequestRemoveDownloadedCollectionAction = PayloadAction<{
  collectionId: ID
}>

export type RequestRemoveFavoritedDownloadedCollectionAction = PayloadAction<{
  collectionId: ID
}>

export type OfflineEntry =
  | {
      type: 'track'
      id: ID
      metadata: OfflineTrackMetadata
    }
  | {
      type: 'collection'
      id: CollectionId
      metadata: OfflineCollectionMetadata
    }
  | {
      type: 'collection-sync'
      id: CollectionId
    }
  | { type: 'play-count'; id: ID }
  | { type: 'stale-track'; id: ID }

export type RedownloadOfflineEntriesAction = PayloadAction<{
  items: OfflineJob[]
}>

export type AddOfflineEntriesAction = PayloadAction<{
  items: OfflineEntry[]
}>

export type RemoveOfflineEntriesAction = PayloadAction<{
  items: OfflineEntry[]
}>

export type CollectionSyncItem = { id: CollectionId }

export type CollectionAction = PayloadAction<{
  collectionId: ID
}>

export type QueueAction = PayloadAction<OfflineJob>

export type SyncAction = PayloadAction<{ id: CollectionId }>

export type CompleteJobAction = PayloadAction<
  | { type: 'track'; id: ID; completedAt: number }
  | { type: 'collection'; id: CollectionId }
  | { type: 'stale-track'; id: ID; verifiedAt: number }
>

export enum QueueStatus {
  IDLE = 'IDLE',
  PAUSED = 'PAUSED',
  PROCESSING = 'PROCESSING'
}

export type UpdateQueueStatusAction = PayloadAction<{
  queueStatus: QueueStatus
}>

export type SetCurrentNetworkTypeAction = PayloadAction<{
  currentNetworkType: NetInfoStateType
}>

export type SetDownloadNetworkPreferenceAction = PayloadAction<{
  downloadNetworkPreference: NetInfoStateType
}>

export enum OfflineDownloadStatus {
  // download is not initiated
  INACTIVE = 'INACTIVE',
  // download is queued
  INIT = 'INIT',
  // download is in progress
  LOADING = 'LOADING',
  // download succeeded
  SUCCESS = 'SUCCESS',
  // download errored
  ERROR = 'ERROR',
  // download was abandoned (usually after error).
  // downloads in the error state can be retried
  ABANDONED = 'ABANDONED'
}

export enum CollectionSyncStatus {
  INIT = 'INIT',
  SYNCING = 'SYNCING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

const initialState: OfflineDownloadsState = {
  isDoneLoadingFromDisk: false,
  trackStatus: {},
  collectionStatus: {},
  collectionSyncStatus: {},
  offlineQueue: [],
  queueStatus: QueueStatus.IDLE,
  offlineCollectionMetadata: {},
  offlineTrackMetadata: {},
  preferredDownloadNetworkType: NetInfoStateType.cellular,
  currentNetworkType: NetInfoStateType.unknown
}

const slice = createSlice({
  name: 'offlineDownloads',
  initialState,
  reducers: {
    redownloadOfflineItems: (state, action: RedownloadOfflineEntriesAction) => {
      const { trackStatus, collectionStatus, offlineQueue } = state
      const { items } = action.payload

      for (const item of items) {
        const { type, id } = item

        if (type === 'collection') {
          collectionStatus[id] = OfflineDownloadStatus.INIT
        } else if (type === 'track') {
          trackStatus[id] = OfflineDownloadStatus.INIT
        }
        offlineQueue.push(item)
      }
    },
    addOfflineEntries: (state, action: AddOfflineEntriesAction) => {
      const { items } = action.payload
      const {
        offlineTrackMetadata,
        trackStatus,
        offlineQueue,
        offlineCollectionMetadata,
        collectionStatus,
        collectionSyncStatus
      } = state
      for (const item of items) {
        if (item.type === 'track') {
          const { type, id, metadata } = item
          addOfflineTrack(offlineTrackMetadata, id, metadata)

          if (
            !trackStatus[id] ||
            trackStatus[id] === OfflineDownloadStatus.ERROR
          ) {
            trackStatus[id] = OfflineDownloadStatus.INIT
            offlineQueue.push({ type, id })
          }
        } else if (item.type === 'collection') {
          const { type, id, metadata } = item
          addOfflineCollection(offlineCollectionMetadata, id, metadata)

          if (!collectionStatus[id]) {
            collectionStatus[id] = OfflineDownloadStatus.INIT
            offlineQueue.push({ type, id })
          }
        } else if (item.type === 'collection-sync') {
          const { id } = item
          const syncStatus = collectionSyncStatus[id]
          if (
            !(
              syncStatus === CollectionSyncStatus.INIT ||
              syncStatus === CollectionSyncStatus.SYNCING
            )
          ) {
            collectionSyncStatus[id] = CollectionSyncStatus.INIT
            offlineQueue.push({ type: 'collection-sync', id })
          }
        } else if (item.type === 'play-count') {
          offlineQueue.push(item)
        } else if (item.type === 'stale-track') {
          const { id } = item
          const trackMetadata = offlineTrackMetadata[id]
          if (trackMetadata) {
            trackMetadata.last_verified_time = Date.now()
          }
          offlineQueue.push({ type: 'stale-track', id })
        }
      }
    },
    removeOfflineItems: (state, action: RemoveOfflineEntriesAction) => {
      const { items } = action.payload
      const {
        offlineTrackMetadata,
        trackStatus,
        offlineQueue,
        offlineCollectionMetadata,
        collectionStatus,
        collectionSyncStatus
      } = state

      for (const item of items) {
        if (item.type === 'track') {
          const { type, id, metadata } = item
          removeOfflineTrack(offlineTrackMetadata, id, metadata)

          if (!offlineTrackMetadata[id]) {
            delete trackStatus[id]
            const trackIndex = offlineQueue.findIndex(
              (queueItem) => queueItem.type === type && queueItem.id === id
            )
            if (trackIndex !== -1) offlineQueue.splice(trackIndex, 1)

            const staleTrackIndex = offlineQueue.findIndex(
              (queueItem) =>
                queueItem.type === 'stale-track' && queueItem.id === id
            )
            if (staleTrackIndex !== -1) offlineQueue.splice(staleTrackIndex, 1)
          }
        } else if (item.type === 'collection') {
          const { id, metadata } = item
          removeOfflineCollection(offlineCollectionMetadata, id, metadata)

          if (!offlineCollectionMetadata[id]) {
            delete collectionStatus[id]
            delete collectionSyncStatus[id]

            const collectionIndex = offlineQueue.findIndex(
              (queueItem) =>
                queueItem.type === 'collection' && queueItem.id === id
            )
            if (collectionIndex !== -1) offlineQueue.splice(collectionIndex, 1)

            const collectionSyncIndex = offlineQueue.findIndex(
              (queueItem) =>
                queueItem.type === 'collection-sync' && queueItem.id === id
            )
            if (collectionSyncIndex !== -1)
              offlineQueue.splice(collectionSyncIndex, 1)
          }
        }
      }
    },
    startJob: (state, action: QueueAction) => {
      const { type, id } = action.payload
      if (type === 'collection') {
        state.collectionStatus[id] = OfflineDownloadStatus.LOADING
      } else if (type === 'track') {
        state.trackStatus[id] = OfflineDownloadStatus.LOADING
      } else if (type === 'stale-track') {
        // continue
      }
    },
    completeJob: (state, action: CompleteJobAction) => {
      const { type, id } = action.payload
      if (type === 'collection') {
        state.collectionStatus[id] = OfflineDownloadStatus.SUCCESS
      } else if (type === 'track') {
        const { completedAt } = action.payload
        state.trackStatus[id] = OfflineDownloadStatus.SUCCESS
        const trackMetadata = state.offlineTrackMetadata[id]
        if (trackMetadata) {
          trackMetadata.last_verified_time = completedAt
          trackMetadata.download_completed_time = completedAt
        }
      } else if (type === 'stale-track') {
        const { verifiedAt } = action.payload
        const trackMetadata = state.offlineTrackMetadata[id]
        if (trackMetadata) {
          trackMetadata.last_verified_time = verifiedAt
        }
      }

      state.offlineQueue.shift()
    },
    cancelJob: (state, action: QueueAction) => {
      const { type, id } = action.payload
      if (type === 'collection') {
        state.collectionStatus[id] = OfflineDownloadStatus.INIT
      } else if (type === 'track') {
        state.trackStatus[id] = OfflineDownloadStatus.INIT
      }
    },
    errorJob: (state, action: QueueAction) => {
      const { type, id } = action.payload
      if (type === 'collection') {
        state.collectionStatus[id] = OfflineDownloadStatus.ERROR
      } else if (type === 'track') {
        state.trackStatus[id] = OfflineDownloadStatus.ERROR
        // re-queue the track
        state.offlineQueue.push({
          ...action.payload,
          requeueCount: (action.payload.requeueCount ?? 0) + 1
        })
      } else if (type === 'stale-track') {
        // continue
      }
      state.offlineQueue.shift()
    },
    abandonJob: (state, action: QueueAction) => {
      const { type, id } = action.payload
      if (type === 'collection') {
        state.collectionStatus[id] = OfflineDownloadStatus.ABANDONED
      } else if (type === 'track') {
        state.trackStatus[id] = OfflineDownloadStatus.ABANDONED
      } else if (type === 'stale-track') {
        state.trackStatus[id] = OfflineDownloadStatus.ABANDONED
      }
      state.offlineQueue.shift()
    },
    startCollectionSync: (state, action: SyncAction) => {
      const { id } = action.payload
      state.collectionSyncStatus[id] = CollectionSyncStatus.SYNCING
    },
    completeCollectionSync: (state, action: SyncAction) => {
      const { id } = action.payload
      state.collectionSyncStatus[id] = CollectionSyncStatus.SUCCESS
      state.offlineQueue.shift()
    },
    cancelCollectionSync: (state, action: SyncAction) => {
      const { id } = action.payload
      state.collectionSyncStatus[id] = CollectionSyncStatus.INIT
    },
    errorCollectionSync: (state, action: SyncAction) => {
      const { id } = action.payload
      state.collectionSyncStatus[id] = CollectionSyncStatus.ERROR
      state.offlineQueue.shift()
    },
    completePlayCount: (state) => {
      state.offlineQueue.shift()
    },
    updateQueueStatus: (state, action: UpdateQueueStatusAction) => {
      state.queueStatus = action.payload.queueStatus
    },
    doneLoadingFromDisk: (state) => {
      state.isDoneLoadingFromDisk = true
    },
    clearOfflineDownloads: (state) => {
      state.trackStatus = initialState.trackStatus
      state.collectionStatus = initialState.collectionStatus
      state.collectionSyncStatus = initialState.collectionSyncStatus
      state.offlineTrackMetadata = initialState.offlineTrackMetadata
      state.trackStatus = initialState.trackStatus
      state.isDoneLoadingFromDisk = initialState.isDoneLoadingFromDisk
      state.offlineQueue = initialState.offlineQueue
      state.queueStatus = initialState.queueStatus
      state.offlineTrackMetadata = initialState.offlineTrackMetadata
      state.offlineCollectionMetadata = initialState.offlineCollectionMetadata
    },
    // Network settings + changes
    setCurrentNetworkType: (state, action: SetCurrentNetworkTypeAction) => {
      const { currentNetworkType } = action.payload
      state.currentNetworkType = currentNetworkType
    },
    setDownloadNetworkPreference: (
      state,
      action: SetDownloadNetworkPreferenceAction
    ) => {
      const { downloadNetworkPreference } = action.payload
      state.preferredDownloadNetworkType = downloadNetworkPreference
    },
    // Lifecycle actions that trigger complex saga flows
    requestDownloadAllFavorites: () => {},
    requestRemoveAllDownloadedFavorites: () => {},
    requestDownloadCollection: (_state, _action: CollectionAction) => {},
    requestDownloadFavoritedCollection: (
      _state,
      _action: CollectionAction
    ) => {},
    requestRemoveDownloadedCollection: (
      _state,
      _action: RequestRemoveDownloadedCollectionAction
    ) => {},
    requestProcessNextJob: () => {}
  }
})

export const {
  addOfflineEntries,
  removeOfflineItems,
  redownloadOfflineItems,
  doneLoadingFromDisk,
  clearOfflineDownloads,
  startJob,
  completeJob,
  cancelJob,
  errorJob,
  abandonJob,
  startCollectionSync,
  completeCollectionSync,
  cancelCollectionSync,
  errorCollectionSync,
  completePlayCount,
  updateQueueStatus,
  setCurrentNetworkType,
  setDownloadNetworkPreference,
  requestDownloadAllFavorites,
  requestDownloadCollection,
  requestDownloadFavoritedCollection,
  requestRemoveAllDownloadedFavorites,
  requestRemoveDownloadedCollection,
  requestProcessNextJob
} = slice.actions
export const actions = slice.actions

const offlineDownloadsPersistConfig = {
  key: 'offline-downloads',
  storage: AsyncStorage,
  blacklist: [
    'isDoneLoadingFromDisk',
    'queueStatus',
    'currentNetworkStateType'
  ],
  // Each job update otherwise re-serializes and rewrites the whole slice,
  // which adds up during large batch downloads
  throttle: 1000
}

const persistedOfflineDownloadsReducer = persistReducer(
  offlineDownloadsPersistConfig,
  slice.reducer
)

export default persistedOfflineDownloadsReducer
