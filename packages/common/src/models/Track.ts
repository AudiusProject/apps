import { License } from '~/utils/creativeCommons'

import { DeepOmit, Nullable } from '../utils/typeUtils'

import { Favorite } from './Favorite'
import { CID, ID, UID } from './Identifiers'
import { CoverArtSizes, CoverArtSizesCids } from './ImageSizes'
import { Repost } from './Repost'
import { StemCategory } from './Stems'
import { Timestamped } from './Timestamped'
import { User, UserMetadata } from './User'

type EpochTimeStamp = number

export interface TrackSegment {
  duration: string
  multihash: CID
}

export interface Followee extends User {
  is_delete: boolean
  repost_item_id: string
  repost_type: string
}

export type FieldVisibility = {
  genre: boolean
  mood: boolean
  tags: boolean
  share: boolean
  play_count: boolean
  remixes: boolean
}

export type Remix = {
  parent_track_id: ID
  user: User | any
  has_remix_author_reposted: boolean
  has_remix_author_saved: boolean
}

export type RemixOf = {
  tracks: Remix[]
}

// Gated content
export type FollowGatedConditions = { follow_user_id: number }

export type TipGatedConditions = { tip_user_id: number }

export type TokenGatedConditions = {
  token_gate: {
    token_mint: string
    token_amount: number
  }
}

export type USDCPurchaseConditions = {
  usdc_purchase: {
    price: number
    albumTrackPrice?: number
    splits: Record<ID, number>
  }
}

export type AccessConditions =
  | FollowGatedConditions
  | TipGatedConditions
  | USDCPurchaseConditions
  | TokenGatedConditions

export type AccessPermissions = {
  stream: boolean
  download: boolean
}

export enum GatedContentType {
  SPECIAL_ACCESS = 'special access',
  USDC_PURCHASE = 'usdc purchase',
  TOKEN_GATED = 'token gated'
}

export enum TrackAccessType {
  PUBLIC = 'public',
  TIP_GATED = 'tip_gated',
  FOLLOW_GATED = 'follow_gated',
  USDC_GATED = 'usdc_gated',
  TOKEN_GATED = 'token_gated'
}

export const isContentFollowGated = (
  gatedConditions?: Nullable<AccessConditions>
): gatedConditions is FollowGatedConditions =>
  !!gatedConditions && 'follow_user_id' in (gatedConditions ?? {})

export const isContentTipGated = (
  gatedConditions?: Nullable<AccessConditions>
): gatedConditions is TipGatedConditions =>
  !!gatedConditions && 'tip_user_id' in (gatedConditions ?? {})

export const isContentTokenGated = (
  gatedConditions?: Nullable<AccessConditions>
): gatedConditions is TokenGatedConditions =>
  !!gatedConditions && 'token_gate' in (gatedConditions ?? {})

export const isContentSpecialAccess = (
  gatedConditions?: Nullable<AccessConditions>
): gatedConditions is TipGatedConditions | FollowGatedConditions =>
  isContentFollowGated(gatedConditions) || isContentTipGated(gatedConditions)

export const isContentUSDCPurchaseGated = (
  gatedConditions?: Nullable<
    AccessConditions | DeepOmit<USDCPurchaseConditions, 'splits'>
  > // data coming from upload/edit forms will not have splits on the type
): gatedConditions is USDCPurchaseConditions =>
  !!gatedConditions && 'usdc_purchase' in (gatedConditions ?? {})

export type AccessSignature = {
  data: string
  signature: string
}

export type NFTAccessSignature = {
  mp3: AccessSignature
  original: AccessSignature
}

export type ResourceContributor = {
  name: string
  roles: string[]
  sequence_number: number
}

export type RightsController = {
  name: string
  roles: string[]
  rights_share_unknown?: string
}

export type Copyright = {
  year: string
  text: string
}

type CoverArtSizesWithMirror = CoverArtSizes & {
  mirrors?: string[] | undefined
}

export type TrackMetadata = {
  allowed_api_keys?: Nullable<string[]>
  audio_upload_id?: Nullable<string>
  blocknumber: number
  activity_timestamp?: string
  is_delete: boolean
  track_id: number
  created_at: string
  create_date: Nullable<string>
  isrc: Nullable<string>
  iswc: Nullable<string>
  credits_splits: Nullable<string>
  description: Nullable<string>
  followee_reposts: Repost[]
  followee_saves: Favorite[]
  genre: string
  has_current_user_reposted: boolean
  has_current_user_saved: boolean
  license: Nullable<License>
  mood: Nullable<string>
  play_count: number
  owner_id: ID
  release_date: Nullable<string>
  repost_count: number
  save_count: number
  tags: Nullable<string>
  title: string
  track_segments: TrackSegment[]
  artwork: CoverArtSizesWithMirror
  cover_art: Nullable<CID>
  cover_art_sizes: Nullable<CID>
  cover_art_cids?: Nullable<CoverArtSizesCids>
  is_scheduled_release: boolean
  is_unlisted: boolean
  is_available: boolean
  is_stream_gated: boolean
  stream_conditions: Nullable<AccessConditions>
  is_download_gated: boolean
  download_conditions: Nullable<AccessConditions>
  access: AccessPermissions
  field_visibility?: FieldVisibility
  listenCount?: number
  permalink: string
  track_cid: Nullable<CID>
  orig_file_cid: Nullable<CID>
  orig_filename: Nullable<string>
  is_downloadable: boolean
  is_original_available: boolean
  is_owned_by_user: boolean
  ddex_app?: Nullable<string>
  ddex_release_ids?: any | null
  artists?: ResourceContributor[] | null
  resource_contributors?: ResourceContributor[] | null
  indirect_resource_contributors?: ResourceContributor[] | null
  rights_controller?: RightsController | null
  copyright_line?: Copyright | null
  producer_copyright_line?: Copyright | null
  parental_warning_type?: string | null
  bpm?: number | null
  is_custom_bpm?: boolean
  is_custom_musical_key?: boolean
  musical_key?: string | null
  audio_analysis_error_count?: number
  comments_disabled?: boolean
  comment_count: number
  pinned_comment_id?: Nullable<ID>

  // Optional Fields
  is_playlist_upload?: boolean
  is_invalid?: boolean
  stem_of?: {
    parent_track_id: ID
    category: StemCategory
  }
  remix_of: Nullable<RemixOf>
  preview_cid?: Nullable<CID>
  preview_start_seconds?: Nullable<number>
  cover_original_song_title?: Nullable<string>
  cover_original_artist?: Nullable<string>

  // Added fields
  dateListened?: string
  duration: number

  offline?: OfflineTrackMetadata
  local?: boolean

  // API returned URLS
  stream?: {
    url?: string
    mirrors: string[]
  }
  download?: {
    url?: string
    mirrors: string[]
  }
  preview?: {
    url?: string
    mirrors: string[]
  }
  album_backlink?: {
    playlist_id: ID
    playlist_name: string
    permalink: string
  }
} & Timestamped

export type WriteableTrackMetadata = TrackMetadata & {
  artwork: CoverArtSizesWithMirror & { file?: File | null; url: '' }
}

export type DownloadReason = {
  is_from_favorites?: boolean
  collection_id: ID | string
}

// This is available on mobile for offline tracks
export type OfflineTrackMetadata = {
  reasons_for_download: DownloadReason[]
  download_completed_time?: EpochTimeStamp
  last_verified_time?: EpochTimeStamp
  favorite_created_at?: string
}

export type Stem = {
  track_id: ID
  category: StemCategory
  orig_filename: string
}

export type ComputedTrackProperties = {
  // All below, added clientside
  _first_segment?: string
  _followees?: Followee[]
  _marked_deleted?: boolean
  _is_publishing?: boolean
  _stems?: Stem[]

  // Present iff remixes have been fetched for a track
  _remixes?: Array<{ track_id: ID }>
  _remixes_count?: number
  // Present iff remix parents have been fetched for a track
  _remix_parents?: Array<{ track_id: ID }>
  // Present iff the track has been cosigned
  _co_sign?: Nullable<Remix>

  _blocked?: boolean
}

export type Track = TrackMetadata & ComputedTrackProperties

export type UserTrackMetadata = TrackMetadata & { user: UserMetadata }

export type UserTrack = Track & {
  user: User
}

export type LineupTrack = UserTrack & {
  uid: UID
}

// Track with known non-optional stem
export type StemTrackMetadata = TrackMetadata & Required<Pick<Track, 'stem_of'>>
export type StemTrack = Track & Required<Pick<Track, 'stem_of'>>
export type StemUserTrack = UserTrack & Required<Pick<Track, 'stem_of'>>

// Track with known non-optional remix parent
export type RemixTrack = Track & Required<Pick<Track, 'remix_of'>>
export type RemixUserTrack = UserTrack & Required<Pick<Track, 'remix_of'>>

export type TrackImage = Pick<
  Track,
  'cover_art' | 'cover_art_sizes' | 'cover_art_cids'
>
