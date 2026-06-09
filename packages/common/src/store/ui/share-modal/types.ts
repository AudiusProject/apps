import { PayloadAction } from '@reduxjs/toolkit'

import { Nullable } from '~/utils/typeUtils'

import { ID, ShareSource, Collection, Track, User } from '../../../models'

export type ShareType = 'track' | 'profile' | 'album' | 'playlist' | 'contest'

type ShareTrackContent = {
  type: 'track'
  track: Track
  artist: User
}

/**
 * Contest shares use the same underlying data as a track share (the
 * contest is keyed off a parent track) but link to the contest page
 * (`{trackPermalink}/contest`) instead of the track itself.
 * When the event has its own permalink from event_routes, that value is
 * passed as `eventPermalink` and used directly.
 */
type ShareContestContent = {
  type: 'contest'
  track: Track
  artist: User
  /** Canonical contest permalink from event_routes, if available. */
  eventPermalink?: string
}

type ShareProfileContent = {
  type: 'profile'
  profile: User
}

type ShareAlbumContent = {
  type: 'album'
  album: Pick<
    Collection,
    'playlist_name' | 'playlist_id' | 'permalink' | 'is_album' | 'is_private'
  >
  artist: User
}

type SharePlaylistContent = {
  type: 'playlist'
  playlist: Pick<
    Collection,
    'playlist_name' | 'playlist_id' | 'permalink' | 'is_album' | 'is_private'
  >
  creator: User
}

export type ShareContent =
  | ShareTrackContent
  | ShareContestContent
  | ShareProfileContent
  | ShareAlbumContent
  | SharePlaylistContent

export type ShareModalRequest =
  | { type: 'track'; trackId: ID }
  | { type: 'contest'; trackId: ID; eventPermalink?: string }
  | { type: 'profile'; profileId: ID }
  | { type: 'collection'; collectionId: ID }

export type ShareModalState = {
  source: Nullable<ShareSource>
  request: Nullable<ShareModalRequest>
}

type RequestOpenPayload = { source: ShareSource } & ShareModalRequest

export type ShareModalRequestOpenAction = PayloadAction<RequestOpenPayload>
