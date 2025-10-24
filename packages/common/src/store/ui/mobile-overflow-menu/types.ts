import { ID } from '../../../models/Identifiers'

// OverflowActions users can take
export enum OverflowAction {
  REPOST = 'REPOST',
  UNREPOST = 'UNREPOST',
  FAVORITE = 'FAVORITE',
  UNFAVORITE = 'UNFAVORITE',
  SHARE = 'SHARE',
  ADD_TO_ALBUM = 'ADD_TO_ALBUM',
  ADD_TO_PLAYLIST = 'ADD_TO_PLAYLIST',
  REMOVE_FROM_PLAYLIST = 'REMOVE_FROM_PLAYLIST',
  EDIT_ALBUM = 'EDIT_ALBUM',
  EDIT_PLAYLIST = 'EDIT_PLAYLIST',
  DELETE_ALBUM = 'DELETE_ALBUM',
  DELETE_PLAYLIST = 'DELETE_PLAYLIST',
  PUBLISH_PLAYLIST = 'PUBLISH_PLAYLIST',
  EDIT_TRACK = 'EDIT_TRACK',
  DELETE_TRACK = 'DELETE_TRACK',
  VIEW_TRACK_PAGE = 'VIEW_TRACK_PAGE',
  VIEW_ARTIST_PAGE = 'VIEW_ARTIST_PAGE',
  VIEW_EPISODE_PAGE = 'VIEW_EPISODE_PAGE',
  VIEW_PLAYLIST_PAGE = 'VIEW_PLAYLIST_PAGE',
  VIEW_ALBUM_PAGE = 'VIEW_ALBUM_PAGE',
  FOLLOW_ARTIST = 'FOLLOW_ARTIST',
  UNFOLLOW_ARTIST = 'UNFOLLOW_ARTIST',
  FOLLOW = 'FOLLOW',
  UNFOLLOW = 'UNFOLLOW',
  MARK_AS_PLAYED = 'MARK_AS_PLAYED',
  MARK_AS_UNPLAYED = 'MARK_AS_UNPLAYED',
  RELEASE_NOW = 'RELEASE_NOW',
  PURCHASE_TRACK = 'PURCHASE_TRACK',
  SET_ARTIST_PICK = 'SET_ARTIST_PICk',
  UNSET_ARTIST_PICK = 'UNSET_ARTIST_PICK',
  VIEW_COMMENTS = 'VIEW_COMMENTS',
  HOST_REMIX_CONTEST = 'HOST_REMIX_CONTEST'
}

export enum OverflowSource {
  TRACKS = 'TRACKS',
  COLLECTIONS = 'COLLECTIONS',
  PROFILE = 'PROFILE'
}

export type OpenOverflowMenuPayload = {
  source: OverflowSource
  id: ID | string
  contextPlaylistId?: ID
  overflowActions: OverflowAction[]
  overflowActionCallbacks?: OverflowActionCallbacks
}

export type OverflowActionCallbacks = {
  [key in OverflowAction]?: () => void
}

export type MobileOverflowModalState = {
  id: ID | string | null /* Notification IDs can be strings */
  /** For track overflow menus to be able to remove from playlist */
  contextPlaylistId: ID | null
  source: OverflowSource
  overflowActions: OverflowAction[]
  overflowActionCallbacks: OverflowActionCallbacks
}
