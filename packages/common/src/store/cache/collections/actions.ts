import { ID, UID, Collection } from '../../../models'

import { EditCollectionValues } from './types'

export const CREATE_PLAYLIST = 'CREATE_PLAYLIST'
export const CREATE_PLAYLIST_REQUESTED = 'CREATE_PLAYLIST_REQUESTED'
export const CREATE_PLAYLIST_SUCCEEDED = 'CREATE_PLAYLIST_SUCCEEDED'
export const CREATE_PLAYLIST_FAILED = 'CREATE_PLAYLIST_FAILED'

export const EDIT_PLAYLIST = 'EDIT_PLAYLIST'
export const EDIT_PLAYLIST_SUCCEEDED = 'EDIT_PLAYLIST_SUCCEEDED'
export const EDIT_PLAYLIST_FAILED = 'EDIT_PLAYLIST_FAILED'

export const ADD_TRACK_TO_PLAYLIST = 'ADD_TRACK_TO_PLAYLIST'
export const ADD_TRACK_TO_PLAYLIST_FAILED = 'ADD_TRACK_TO_PLAYLIST_FAILED'

export const REMOVE_TRACK_FROM_PLAYLIST = 'REMOVE_TRACK_FROM_PLAYLIST'
export const REMOVE_TRACK_FROM_PLAYLIST_FAILED =
  'REMOVE_TRACK_FROM_PLAYLIST_FAILED'

export const ORDER_PLAYLIST = 'ORDER_PLAYLIST'
export const ORDER_PLAYLIST_FAILED = 'ORDER_PLAYLIST_FAILED'

export const PUBLISH_PLAYLIST = 'PUBLISH_PLAYLIST'
export const PUBLISH_PLAYLIST_FAILED = 'PUBLISH_PLAYLIST_FAILED'

export const DUPLICATE_PLAYLIST = 'DUPLICATE_PLAYLIST'

/**
 * @param initTrackId optional track id to pull artwork from.
 */
export function createAlbum(
  formFields: Partial<Collection>,
  source: string,
  initTrackId?: number | null,
  noticeType: 'route' | 'toast' = 'route'
) {
  return {
    type: CREATE_PLAYLIST,
    formFields,
    source,
    initTrackId,
    noticeType,
    isAlbum: true
  }
}

/**
 * @param initTrackId optional track id to pull artwork from.
 */
export function createPlaylist(
  formFields: Partial<Collection>,
  source: string,
  initTrackId?: number | null,
  noticeType: 'route' | 'toast' = 'route'
) {
  return {
    type: CREATE_PLAYLIST,
    formFields,
    source,
    initTrackId,
    noticeType,
    isAlbum: false
  }
}

export function createPlaylistRequested(
  playlistId: ID,
  noticeType: 'route' | 'toast',
  isAlbum: boolean
) {
  return { type: CREATE_PLAYLIST_REQUESTED, playlistId, noticeType, isAlbum }
}

export function createPlaylistSucceeded() {
  return { type: CREATE_PLAYLIST_SUCCEEDED }
}

export function createPlaylistFailed(
  error: Error,
  params: Record<string, unknown>,
  metadata: Record<string, unknown>
) {
  return { type: CREATE_PLAYLIST_FAILED, error, params, metadata }
}

export function editPlaylist(
  playlistId: number,
  formFields: EditCollectionValues,
  onComplete?: (success: boolean, error?: Error) => void
) {
  return { type: EDIT_PLAYLIST, playlistId, formFields, onComplete }
}

export function editPlaylistSucceeded() {
  return { type: EDIT_PLAYLIST_SUCCEEDED }
}

export function editPlaylistFailed(
  error: Error,
  params: Record<string, unknown>,
  metadata: Record<string, unknown>
) {
  return { type: EDIT_PLAYLIST_FAILED, error, params, metadata }
}

export function addTrackToPlaylist(
  trackId: ID,
  playlistId: ID,
  options?: { silent?: boolean }
) {
  return {
    type: ADD_TRACK_TO_PLAYLIST,
    trackId,
    playlistId,
    silent: options?.silent ?? false
  }
}

export function addTrackToPlaylistFailed(
  error: Error,
  params: Record<string, unknown>,
  metadata: Record<string, unknown>
) {
  return { type: ADD_TRACK_TO_PLAYLIST_FAILED, error, params, metadata }
}

export function removeTrackFromPlaylist(
  trackId: ID,
  playlistId: ID,
  timestamp: number
) {
  return { type: REMOVE_TRACK_FROM_PLAYLIST, trackId, playlistId, timestamp }
}

export function removeTrackFromPlaylistFailed(
  error: Error,
  params: Record<string, unknown>,
  metadata: Record<string, unknown>
) {
  return { type: REMOVE_TRACK_FROM_PLAYLIST_FAILED, error, params, metadata }
}

export function orderPlaylist(
  playlistId: number,
  trackIdsAndTimes: { id: ID; time: number }[],
  trackUids?: UID[]
) {
  return { type: ORDER_PLAYLIST, playlistId, trackIdsAndTimes, trackUids }
}

export function orderPlaylistFailed(
  error: Error,
  params: Record<string, unknown>,
  metadata: Record<string, unknown>
) {
  return { type: ORDER_PLAYLIST_FAILED, error, params, metadata }
}

export function publishPlaylist(
  playlistId: ID,
  dismissToastKey?: string,
  isAlbum?: boolean
) {
  return {
    type: PUBLISH_PLAYLIST,
    playlistId,
    dismissToastKey,
    isAlbum
  }
}

export function publishPlaylistFailed(
  error: Error,
  params: Record<string, unknown>,
  metadata: Record<string, unknown>
) {
  return { type: PUBLISH_PLAYLIST_FAILED, error, params, metadata }
}

export function duplicatePlaylist({
  sourcePlaylistId,
  formFields,
  trackIds,
  source,
  isAlbum
}: {
  sourcePlaylistId: ID
  formFields: Partial<Collection>
  trackIds: ID[]
  source: string
  isAlbum?: boolean
}) {
  return {
    type: DUPLICATE_PLAYLIST,
    sourcePlaylistId,
    formFields,
    trackIds,
    source,
    isAlbum: !!isAlbum
  }
}
