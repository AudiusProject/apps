import type {
  ID,
  UID,
  LineupState,
  Status,
  Track,
  Collection
} from '../../../models'
import type { Nullable } from '../../../utils/typeUtils'

export enum CollectionSortMode {
  TIMESTAMP = 0,
  SAVE_COUNT = 1
}

export enum TracksSortMode {
  RECENT = 0,
  POPULAR = 1
}

export type ProfilePageFollow = {
  userIds: { id: ID; uid?: UID }[]
  status: Status
}

export type ProfileState = {
  handle: string
  userId: number
  status: Status
  updating: boolean
  updateSuccess: boolean
  updateError: boolean
  collectionIds: number[]
  collectionStatus: Status
  collectionSortMode: CollectionSortMode
  profileMeterDismissed: boolean
  feed: LineupState<Track | Collection>
  tracks: LineupState<Track>
  error?: string
}

export type ProfilePageState = {
  currentUser: Nullable<string>
  entries: Record<string, ProfileState>
}

export enum ProfilePageTabs {
  TRACKS = 'Tracks',
  ALBUMS = 'Albums',
  PLAYLISTS = 'Playlists',
  REPOSTS = 'Reposts'
}

export enum ProfilePageTabRoute {
  TRACKS = 'tracks',
  ALBUMS = 'albums',
  PLAYLISTS = 'playlists',
  REPOSTS = 'reposts'
}

export const getTabForRoute = (tabRoute: ProfilePageTabRoute) => {
  switch (tabRoute) {
    case ProfilePageTabRoute.TRACKS:
      return ProfilePageTabs.TRACKS
    case ProfilePageTabRoute.ALBUMS:
      return ProfilePageTabs.ALBUMS
    case ProfilePageTabRoute.PLAYLISTS:
      return ProfilePageTabs.PLAYLISTS
    case ProfilePageTabRoute.REPOSTS:
      return ProfilePageTabs.REPOSTS
  }
}
