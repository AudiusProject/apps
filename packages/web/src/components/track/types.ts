import { MouseEvent, ReactNode } from 'react'

import { CollectionTrack } from '@audius/common/api'
import {
  PlaybackSource,
  Collection,
  Favorite,
  ID,
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
  togglePlay: (trackId: ID, source?: PlaybackSource) => void
  trackTileStyles?: {}
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
  order?: number
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
  source?: ModalSource
}

export type CollectionTileProps = TileProps & {
  playingTrackId?: ID | null
  playingIndex?: number | null
  isAlbum: boolean
  isPublic: boolean
  contentTitle: string
  playlistTitle: string
  permalink?: string
  artistName: string
  artistHandle: string
  artistIsVerified: boolean
  saveCount: number
  tracks: CollectionTrack[]
  trackCount: number
  collection?: Nullable<Collection>
  showArtworkIcon?: boolean
  showSkeleton?: boolean
  noShimmer?: boolean
  pauseTrack: () => void
  playTrack: (trackId: ID, index: number) => void
  disableActions?: boolean
  ordered?: boolean
  isFeed?: boolean
  uploading?: boolean
  uploadPercent?: number
  ownerId: ID
  record?: (event: any) => void
  numLoadingSkeletonRows?: number
  source?: ModalSource
}

export type DesktopTrackTileProps = {
  size: TrackTileSize

  order?: number

  standalone?: boolean

  isActive: boolean

  isDisabled?: boolean

  isPlaying?: boolean

  isScheduledRelease?: boolean

  streamConditions?: Nullable<AccessConditions>

  hasStreamAccess?: boolean

  isLoading?: boolean

  numLoadingSkeletonRows?: number

  isArtistPick?: boolean

  releaseDate?: Nullable<string>

  isDarkMode?: boolean

  isMatrixMode: boolean

  artwork: ReactNode

  header?: ReactNode

  title: ReactNode

  genre?: Genre

  userName: ReactNode

  rightActions?: ReactNode

  bottomBar?: ReactNode

  duration?: number

  containerClassName?: string

  isOwner: boolean

  isFavorited?: boolean

  isReposted?: boolean

  showIconButtons?: boolean

  onClickTitle?: (e: MouseEvent) => void

  onClickRepost: (e?: MouseEvent) => void

  onClickFavorite: (e?: MouseEvent) => void

  onClickShare: (e?: MouseEvent) => void

  onClickLocked?: () => void

  onTogglePlay: (e?: MouseEvent) => void

  isTrending?: boolean

  permalink: string

  isTrack?: boolean

  trackId?: ID

  collectionId?: ID

  source?: ModalSource
}

export type DesktopPlaylistTileProps = {
  size: TrackTileSize

  order?: number

  isActive: boolean

  isPlaying: boolean

  isDisabled?: boolean

  isLoading?: boolean

  numLoadingSkeletonRows?: number

  isArtistPick?: boolean

  isDarkMode?: boolean

  isMatrixMode: boolean

  artwork: ReactNode

  header?: ReactNode

  title: ReactNode

  userName: ReactNode

  rightActions?: ReactNode

  bottomBar?: ReactNode

  duration?: number

  containerClassName?: string

  tileClassName?: string

  tracksContainerClassName?: string

  isOwner: boolean

  isFavorited?: boolean

  isReposted?: boolean

  showIconButtons?: boolean

  onClickTitle: (e: MouseEvent) => void

  onClickRepost: (e?: MouseEvent) => void

  onClickFavorite: (e?: MouseEvent) => void

  onClickShare: (e?: MouseEvent) => void

  onClickGatedUnlockPill?: (e: MouseEvent) => void

  onTogglePlay: (e?: MouseEvent) => void

  trackList: ReactNode[]

  trackCount: number

  TileTrackContainer?: any

  isTrending?: boolean

  href: string

  hasStreamAccess: boolean

  streamConditions?: Nullable<AccessConditions>

  source?: ModalSource

  playlistId: ID
}
