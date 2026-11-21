export type Maybe<T> = T | undefined
export type Nullable<T> = T | null

export interface Logger {
  info: (message: any, ...optionalParams: any[]) => any

  error: (message: any, ...optionalParams: any[]) => any

  warn: (message: any, ...optionalParams: any[]) => any

  debug?: (message: any, ...optionalParams: any[]) => any
}

type CID = string
type ID = number
type UID = string

export type UserMetadata = {
  user_id: number
  album_count: number
  artist_pick_track_id: Nullable<number>
  bio: string | null
  cover_photo: Nullable<CID>
  creator_node_endpoint: string
  current_user_followee_follow_count: number
  does_current_user_follow: boolean
  does_current_user_subscribe: boolean
  followee_count: number
  follower_count: number
  supporter_count: number
  supporting_count: number
  handle: Nullable<string>
  handle_lc: string
  is_deactivated: boolean
  is_verified: boolean
  twitter_handle: Nullable<string>
  instagram_handle: Nullable<string>
  tiktok_handle: Nullable<string>
  verified_with_twitter: boolean
  verified_with_instagram: boolean
  verified_with_tiktok: boolean
  website: Nullable<string>
  donation: Nullable<string>
  is_storage_v2: boolean
  location: Nullable<string>
  is_creator: boolean
  name: string
  playlist_count: number
  profile_picture: Nullable<CID>
  repost_count: number
  track_count: number
  cover_photo_sizes: Nullable<CID>
  profile_picture_sizes: Nullable<CID>
  metadata_multihash: Nullable<CID>
  has_collectibles: boolean
  primary_id: number
  secondary_ids: number[]

  track_save_count?: number
  wallet?: string
}

export type User = UserMetadata

export interface TrackSegment {
  duration: string
  multihash: CID
}

export type TokenStandard = 'ERC721' | 'ERC1155'

export type EthCollectibleGatedConditions = {
  chain: 'eth'
  standard: TokenStandard
  address: string
  name: string
  slug: string
  imageUrl: Nullable<string>
  externalLink: Nullable<string>
}

export type SolCollectibleGatedConditions = {
  chain: 'sol'
  address: string
  name: string
  imageUrl: Nullable<string>
  externalLink: Nullable<string>
}

type USDCPurchaseConditions = {
  usdc_purchase?: {
    price: number
    splits: Record<ID, number>
  }
}

type DDEXReleaseIDs = {
  [key: string]: string
}

type ResourceContributor = {
  name: string
  roles: string[]
  sequence_number: number
}

type RightsController = {
  name: string
  roles: string[]
  rights_share_unknown?: string
}

type Copyright = {
  year: string
  text: string
}

type FieldVisibility = {
  mood?: boolean
  tags?: boolean
  genre?: boolean
  share?: boolean
  playCount?: boolean
  remixes?: boolean
}

export type GatedConditions = {
  nft_collection?: EthCollectibleGatedConditions | SolCollectibleGatedConditions
  follow_user_id?: number
  tip_user_id?: number
} & USDCPurchaseConditions

export type TrackMetadata = {
  blocknumber: number
  activity_timestamp?: string
  is_delete: boolean
  track_id: number
  track_cid: string
  preview_cid: Nullable<CID>
  orig_file_cid: CID
  orig_filename: string
  is_downloadable: boolean
  is_original_available: boolean
  created_at: string
  isrc: Nullable<string>
  iswc: Nullable<string>
  credits_splits: Nullable<string>
  description: Nullable<string>
  genre: string
  has_current_user_reposted: boolean
  has_current_user_saved: boolean
  license: Nullable<string>
  mood: Nullable<string>
  play_count: number
  owner_id: ID
  release_date: Nullable<string>
  repost_count: number
  save_count: number
  comment_count: number
  tags: Nullable<string>
  title: string
  track_segments: TrackSegment[]
  cover_art: Nullable<CID>
  cover_art_sizes: Nullable<CID>
  is_unlisted: boolean
  is_scheduled_release: boolean
  is_available: boolean
  is_owned_by_user?: boolean
  is_stream_gated: boolean
  stream_conditions: Nullable<GatedConditions>
  is_download_gated: boolean
  download_conditions: Nullable<GatedConditions>
  comments_disabled?: boolean
  listenCount?: number
  permalink: string
  audio_upload_id: Nullable<string>
  preview_start_seconds: Nullable<number>
  placement_hosts?: Nullable<string>
  ddex_app?: Nullable<string>
  ddex_release_ids?: Nullable<DDEXReleaseIDs>
  artists?: Nullable<ResourceContributor[]>
  resource_contributors?: Nullable<ResourceContributor[]>
  indirect_resource_contributors?: Nullable<ResourceContributor[]>
  rights_controller?: Nullable<RightsController>
  copyright_line?: Nullable<Copyright>
  producer_copyright_line?: Nullable<Copyright>
  parental_warning_type?: Nullable<string>
  remix_of: Nullable<{
    tracks: Array<{
      parent_track_id: ID
    }>
  }>

  is_invalid?: boolean
  stem_of?: {
    parent_track_id: ID
  }
  cover_original_song_title?: Nullable<string>
  cover_original_artist?: Nullable<string>

  dateListened?: string
  duration: number

  is_playlist_upload?: boolean
  ai_attribution_user_id?: Nullable<ID>
  allowed_api_keys?: Nullable<string[]>
  bpm?: Nullable<number>
  is_custom_bpm?: boolean
  musical_key?: Nullable<string>
  is_custom_musical_key?: boolean
  audio_analysis_error_count?: number
  field_visibility?: FieldVisibility
}

export type CollectionMetadata = {
  blocknumber: number
  description: Nullable<string>
  has_current_user_reposted: boolean
  has_current_user_saved: boolean
  is_album: boolean
  is_delete: boolean
  is_private: boolean
  is_scheduled_release: boolean
  release_date: Nullable<string>
  playlist_contents: {
    track_ids: Array<{
      metadata_time: number
      time: number
      track: ID
      uid?: UID
    }>
  }
  tracks?: TrackMetadata[]
  track_count: number
  playlist_id: ID
  cover_art: CID | null
  cover_art_sizes: Nullable<CID>
  playlist_name: string
  playlist_owner_id: ID
  repost_count: number
  save_count: number
  upc?: string | null
  updated_at: string
  activity_timestamp?: string
  is_image_autogenerated?: boolean
  ddex_app?: Nullable<string>
  ddex_release_ids?: Nullable<DDEXReleaseIDs>
  artists?: Nullable<ResourceContributor[]>
  copyright_line?: Nullable<Copyright>
  producer_copyright_line?: Nullable<Copyright>
  parental_warning_type?: Nullable<string>
}

export type UploadTrackMetadata = Omit<
  TrackMetadata,
  | 'preview_cid'
  | 'track_cid'
  | 'audio_upload_id'
  | 'orig_file_cid'
  | 'orig_filename'
  | 'bpm'
  | 'musical_key'
  | 'audio_analysis_error_count'
>
