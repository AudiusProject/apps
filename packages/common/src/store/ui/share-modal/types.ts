import { PayloadAction } from '@reduxjs/toolkit'

import { Nullable } from '~/utils/typeUtils'

import { ID, ShareSource, Collection, Track, User } from '../../../models'

export type ShareType =
  | 'track'
  | 'profile'
  | 'album'
  | 'playlist'
  | 'contest'
  | 'weeklyRotation'

type ShareTrackContent = {
  type: 'track'
  track: Track
  artist: User
}

/**
 * Contest shares use the same underlying data as a track share (the
 * contest is keyed off a parent track) but link to the contest page
 * (`{trackPermalink}/contest`) instead of the track itself.
 */
type ShareContestContent = {
  type: 'contest'
  track: Track
  artist: User
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

/**
 * A user's Weekly Rotation. Not backed by an entity; the link is built from
 * the user's handle.
 */
type ShareWeeklyRotationContent = {
  type: 'weeklyRotation'
  user: User
}

export type ShareContent =
  | ShareTrackContent
  | ShareContestContent
  | ShareProfileContent
  | ShareAlbumContent
  | SharePlaylistContent
  | ShareWeeklyRotationContent

export type ShareModalRequest =
  | { type: 'track'; trackId: ID }
  | { type: 'contest'; trackId: ID }
  | { type: 'profile'; profileId: ID }
  | { type: 'collection'; collectionId: ID }
  | { type: 'weeklyRotation'; userId: ID }

export type ShareModalState = {
  source: Nullable<ShareSource>
  request: Nullable<ShareModalRequest>
}

type RequestOpenPayload = { source: ShareSource } & ShareModalRequest

export type ShareModalRequestOpenAction = PayloadAction<RequestOpenPayload>
