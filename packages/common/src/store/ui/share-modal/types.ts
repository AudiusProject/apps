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
  | 'milestone'

type ShareTrackContent = {
  type: 'track'
  track: Track
  artist: User
}

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

type ShareWeeklyRotationContent = {
  type: 'weeklyRotation'
  user: User
}

export type ShareMilestoneStat =
  | { kind: 'listens'; count: number }
  | { kind: 'trending' | 'underground'; rank: number }
  | { kind: 'featured'; playlistName: string }
  | { kind: 'genre'; rank: number; genre: string }

type ShareMilestoneContent = {
  type: 'milestone'
  track: Track
  artist: User
  stat: ShareMilestoneStat
}

export type ShareContent =
  | ShareTrackContent
  | ShareContestContent
  | ShareProfileContent
  | ShareAlbumContent
  | SharePlaylistContent
  | ShareWeeklyRotationContent
  | ShareMilestoneContent

export type ShareModalRequest =
  | { type: 'track'; trackId: ID }
  | { type: 'contest'; trackId: ID }
  | { type: 'profile'; profileId: ID }
  | { type: 'collection'; collectionId: ID }
  | { type: 'weeklyRotation'; userId: ID }
  | { type: 'milestone'; trackId: ID; stat: ShareMilestoneStat }

export type ShareModalState = {
  source: Nullable<ShareSource>
  request: Nullable<ShareModalRequest>
}

type RequestOpenPayload = { source: ShareSource } & ShareModalRequest

export type ShareModalRequestOpenAction = PayloadAction<RequestOpenPayload>
