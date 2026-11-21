import type { ID } from '@audius/common/models'

import type { AppState } from 'app/store'

import { DOWNLOAD_REASON_FAVORITES } from './constants'
import type { CollectionId } from './slice'
import { OfflineDownloadStatus } from './slice'

export const getOfflineTrackStatus = (state: AppState) =>
  state.offlineDownloads.trackStatus

export const getTrackOfflineDownloadStatus =
  (trackId?: number) => (state: AppState) =>
    trackId ? (state.offlineDownloads.trackStatus[trackId] ?? null) : null

export const getTrackDownloadStatus = (state: AppState, trackId: ID) =>
  state.offlineDownloads.trackStatus[trackId]

export const getCollectionOfflineDownloadStatus =
  (collectionId?: CollectionId) => (state: AppState) =>
    collectionId ? state.offlineDownloads.collectionStatus[collectionId] : null

export const getCollectionDownloadStatus = (
  state: AppState,
  collectionId: CollectionId
) => state.offlineDownloads.collectionStatus[collectionId]

export const getCollectionSyncStatus = (
  state: AppState,
  collectionId: CollectionId
) => state.offlineDownloads.collectionSyncStatus[collectionId]

export const getIsFavoritesDownloadsEnabled = (state: AppState) =>
  Boolean(state.offlineDownloads.collectionStatus[DOWNLOAD_REASON_FAVORITES])

export const getIsCollectionMarkedForDownload =
  (collectionId?: string | ID) => (state: AppState) =>
    !!(collectionId && state.offlineDownloads.collectionStatus[collectionId])

export const getTrackOfflineMetadata =
  (trackId?: number) => (state: AppState) =>
    trackId ? state.offlineDownloads.offlineTrackMetadata[trackId] : null

export const getTrackDownloadReasons =
  (trackId?: number) => (state: AppState) =>
    trackId
      ? state.offlineDownloads.offlineTrackMetadata[trackId]
          .reasons_for_download
      : []

export const getIsDoneLoadingFromDisk = (state: AppState): boolean =>
  state.offlineDownloads.isDoneLoadingFromDisk

export const getOfflineTrackMetadata = (state: AppState) =>
  state.offlineDownloads.offlineTrackMetadata

export const getOfflineCollectionMetadata = (state: AppState) =>
  state.offlineDownloads.offlineCollectionMetadata

export const getOfflineCollectionsStatus = (state: AppState) =>
  state.offlineDownloads.collectionStatus

export const getOfflineQueue = (state: AppState) =>
  state.offlineDownloads.offlineQueue

export const getQueueStatus = (state: AppState) =>
  state.offlineDownloads.queueStatus

export const getOfflineTrackIds = (state: AppState) =>
  Object.entries(state.offlineDownloads.trackStatus)
    .filter(
      ([id, downloadStatus]) => downloadStatus === OfflineDownloadStatus.SUCCESS
    )
    .map(([id, downloadstatus]) => id)

export const getPreferredDownloadNetworkType = (state: AppState) =>
  state.offlineDownloads.preferredDownloadNetworkType

export const getCurrentNetworkType = (state: AppState) =>
  state.offlineDownloads.currentNetworkType
