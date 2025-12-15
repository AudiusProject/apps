import { MouseEvent, ReactNode } from 'react'

import { CollectionTrackWithUid } from '@audius/common/api'
import {
  PlaybackSource,
  Collection,
  Favorite,
  ID,
  UID,
  Repost,
  Remix,
  AccessConditions,
  ModalSource,
  FieldVisibility
} from '@audius/common/models'
import { Genre, Nullable } from '@audius/common/utils'

export enum TrackTileSize {
  LARGE = 'LARGE',
  SMALL = 'SMALL'
}

export type TileProps = {
  size?: TrackTileSize
  containerClassName?: string
  index: number
  repostCount: number
  followeeReposts: Repost[]
  followeeSaves: Favorite[]
  hasCurrentUserReposted: boolean
  hasCurrentUserSaved: boolean
  duration: number
  activityTimestamp?: string
  togglePlay: (uid: UID, trackId: ID, source?: PlaybackSource) => void
  trackTileStyles?: {}
  uid: UID
  id: ID
  userId: ID
  isActive: boolean
  isPlaying: boolean
  isLoading: boolean
  hasLoaded?: (index: number) => void
  isTrending: boolean
  variant?: 'readonly'
}

export type TrackTileProps = TileProps & {
  title: string
  genre: Genre
  showListens?: boolean
  disableActions?: boolean
  showArtworkIcon?: boolean
  showSkeleton?: boolean
  noShimmer?: boolean
  userSignedIn?: boolean
  saveCount: number
  commentCount: number
  commentsDisabled?: boolean
  fieldVisibility?: FieldVisibility
  artistName: string
  artistHandle: string
  artistIsVerified: boolean
  isFeed?: boolean
  isPlaying?: boolean
  isBuffering?: boolean
  ordered?: boolean
  uploading?: boolean
  uploadPercent?: number
  uploadText?: string
  uploadError?: boolean
  isArtistPick?: boolean
  showArtistPick?: boolean
  isUnlisted?: boolean
  coSign?: Remix | null
  releaseDate?: Nullable<string>
  isScheduledRelease?: boolean
  onClickOverflow?: (trackId: ID) => void
  /** Provides more context to analytics about where the tile is being used */
  source?: ModalSource
}

export type CollectionTileProps = TileProps & {
  playingUid?: UID | null
  playingTrackId?: ID | null
  isAlbum: boolean
  isPublic: boolean
  contentTitle: string
  playlistTitle: string
  permalink?: string
  artistName: string
  artistHandle: string
  artistIsVerified: boolean
  activeTrackUid: UID | null
  saveCount: number
  tracks: CollectionTrackWithUid[]
  trackCount: number
  collection?: Nullable<Collection>
  showArtworkIcon?: boolean
  showSkeleton?: boolean
  noShimmer?: boolean
  pauseTrack: () => void
  playTrack: (uid: UID) => void
  disableActions?: boolean
  ordered?: boolean
  isFeed?: boolean
  uploading?: boolean
  uploadPercent?: number
  ownerId: ID
  // TODO: remove when making all playlist tiles functional components
  record?: (event: any) => void
  /** Number of rows to show when in loading state, if any */
  numLoadingSkeletonRows?: number
  /** Provides more context to analytics about where the tile is being used */
  source?: ModalSource
}

export type DesktopTrackTileProps = {
  /** Size of the track Tile Large or Small */
  size: TrackTileSize

  /** Prefix order number displayed on the left side of the tile */
  order?: number

  /** If there is nothing underneath, it's standalone */
  standalone?: boolean

  /** If the track is currently active */
  isActive: boolean

  /** If the button actions should be clickable */
  isDisabled?: boolean

  /** If the track is playing */
  isPlaying?: boolean

  /** If the track is a scheduled release */
  isScheduledRelease?: boolean

  /** Stream conditions if track is gated */
  streamConditions?: Nullable<AccessConditions>

  /** If logged in user has access to track */
  hasStreamAccess?: boolean

  /** If track metadata is loading in */
  isLoading?: boolean

  /** Number of rows to show when in loading state, if any */
  numLoadingSkeletonRows?: number

  /** If the artist selected this track as featured, displays a star and artst pick label */
  isArtistPick?: boolean

  /** Release date for track */
  releaseDate?: Nullable<string>

  /** If in dark mode for the bottom buttons to be colored */
  isDarkMode?: boolean

  /** Are we in matrix mode? */
  isMatrixMode: boolean

  /** The artwork for the track tile */
  artwork: ReactNode

  /** The upper most text in the tracktile */
  header?: ReactNode

  /** The beneath the header is the title, for the track's name */
  title: ReactNode

  /** For updating the duration format based on if the track is a podcast */
  genre?: Genre

  /** The beneath the title is the username, for the track's creator */
  userName: ReactNode

  /** Displayed on the bottom right is the kebab icon for menu options */
  rightActions?: ReactNode

  /** Optional bottom bar to be rendered in place of the favorite, repost and share icons */
  bottomBar?: ReactNode

  /** The track's duration in seconds displayed in the top right */
  duration?: number

  /** Class name to be added to the top level container of the tracktile */
  containerClassName?: string

  /** Incdates if the current user if the creator of the track tile */
  isOwner: boolean

  /** Incdates if the current user has favorited the track */
  isFavorited?: boolean

  /** Incdates if the current user has reposted the track */
  isReposted?: boolean

  /** Incdates if the repost, favorite, and share buttons should be rendered */
  showIconButtons?: boolean

  /** on click title */
  onClickTitle?: (e: MouseEvent) => void

  /** on click repost icon */
  onClickRepost: (e?: MouseEvent) => void

  /** on click favorite icon */
  onClickFavorite: (e?: MouseEvent) => void

  /** on click share icon */
  onClickShare: (e?: MouseEvent) => void

  /** When the user clicks on the locked pill */
  onClickLocked?: () => void

  /** On click track tile that's does not trigger another action (ie. button or text) */
  onTogglePlay: (e?: MouseEvent) => void

  /** Are we in a trending lineup? Allows tiles to specialize their rendering */
  isTrending?: boolean

  /** The relative link of the track */
  permalink: string

  /** Whether the tile is for a track */
  isTrack?: boolean

  /** Track id if track tile */
  trackId?: ID

  /**
   * Collection id if playlist tile
   * Note this is a total hack and we should split out playlist tile from track tile
   * */
  collectionId?: ID

  /** Additional context for analytics to know which area of the app the track tile is being used */
  source?: ModalSource
}

export type DesktopPlaylistTileProps = {
  /** Size of the track Tile Large or Small */
  size: TrackTileSize

  /** Prefix order number displayed on the left side of the track tile */
  order?: number

  /** If the playlist is currently active */
  isActive: boolean

  /** If the playlist is currently playing */
  isPlaying: boolean

  /** If the button actions should be clickable */
  isDisabled?: boolean

  /** If track metadata is loading in */
  isLoading?: boolean

  /** Number of rows to show when in loading state, if any */
  numLoadingSkeletonRows?: number

  /** If the artist selected this track as featured, displays a star and artst pick label */
  isArtistPick?: boolean

  /** If in dark mode for the bottom buttons to be colored */
  isDarkMode?: boolean

  /** Are we in matrix mode? */
  isMatrixMode: boolean

  /** The artwork for the track tile */
  artwork: ReactNode

  /** The upper most text in the tracktile */
  header?: ReactNode

  /** The beneath the header is the title, for the track's name */
  title: ReactNode

  /** The beneath the title is the username, for the track's creator */
  userName: ReactNode

  /** Displayed on the bottom right is the kebab icon for menu options */
  rightActions?: ReactNode

  /** Optional bottom bar to be rendered in place of the favorite, repost and share icons */
  bottomBar?: ReactNode

  /** The track's duration in seconds displayed in the top right */
  duration?: number

  /** Class name to be added to the top level container of the playlist tile */
  containerClassName?: string

  /** Class name to be added to the top level container of the tracktile */
  tileClassName?: string

  /** Class name to be added to the top level container of the tracklist */
  tracksContainerClassName?: string

  /** Incdates if the current user if the creator of the track tile */
  isOwner: boolean

  /** Incdates if the current user has favorited the track */
  isFavorited?: boolean

  /** Incdates if the current user has reposted the track */
  isReposted?: boolean

  /** Incdates if the repost, favorite, and share buttons should be rendered */
  showIconButtons?: boolean

  /** on click title */
  onClickTitle: (e: MouseEvent) => void

  /** on click repost icon */
  onClickRepost: (e?: MouseEvent) => void

  /** on click favorite icon */
  onClickFavorite: (e?: MouseEvent) => void

  /** on click share icon */
  onClickShare: (e?: MouseEvent) => void

  /** on click unlock content pill */
  onClickGatedUnlockPill?: (e: MouseEvent) => void

  /** On click track tile that's does not trigger another action (ie. button or text) */
  onTogglePlay: (e?: MouseEvent) => void

  /** The list of tracks to be rendered under the tracktile  */
  trackList: ReactNode[]

  /** The full track count for the playlist (may include tracks not rendered) */
  trackCount: number

  /** The wrapper react compoenent for the track tile - can be used for drag and drop */
  TileTrackContainer?: any

  /** Are we in a trending lineup? Allows tiles to specialize their rendering */
  isTrending?: boolean

  /** Relative link to playlist page */
  href: string

  /** If the current user has streaming access */
  hasStreamAccess: boolean

  /** Stream gated conditions for the collection */
  streamConditions?: Nullable<AccessConditions>

  /** Additional context for analytics to know which area of the app the track tile is being used */
  source?: ModalSource

  /** ID for the playlist */
  playlistId: ID
}
