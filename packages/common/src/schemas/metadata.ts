import { pick } from 'lodash'

import { WriteableTrackMetadata, WriteableUserMetadata } from '~/models'

const trackMetadataSchema = {
  track_cid: null,
  orig_file_cid: null,
  orig_filename: null,
  owner_id: null,
  title: null,
  duration: null,
  length: null,
  cover_art: null,
  cover_art_sizes: null,
  tags: null,
  genre: null,
  mood: null,
  credits_splits: null,
  created_at: null,
  // TODO: CREATE DATE IS REQUIRED, BUT THIS FIELD IS NEVER USED.
  create_date: null,
  updated_at: null,
  release_date: null,
  file_type: null,
  track_segments: [],
  has_current_user_reposted: false,
  followee_reposts: null,
  followee_saves: null,
  is_current: true,
  is_scheduled_release: false,
  is_unlisted: false,
  is_stream_gated: false,
  stream_conditions: null,
  is_download_gated: false,
  download_conditions: null,
  is_original_available: false,
  is_downloadable: false,
  preview_start_seconds: null,
  audio_upload_id: null,
  field_visibility: {
    genre: true,
    mood: true,
    tags: true,
    share: false,
    play_count: false,
    remixes: true
  },
  remix_of: null,
  repost_count: 0,
  save_count: 0,
  description: null,
  license: null,
  isrc: null,
  iswc: null,
  is_playlist_upload: false,
  ddex_release_ids: null,
  ddex_app: null,
  artists: null,
  resource_contributors: null,
  indirect_resource_contributors: null,
  rights_controller: null,
  copyright_line: null,
  producer_copyright_line: null,
  parental_warning_type: null,
  allowed_api_keys: null,
  bpm: null,
  is_custom_bpm: false,
  is_custom_musical_key: false,
  musical_key: null,
  audio_analysis_error_count: 0,
  comments_disabled: false,
  comment_count: 0,
  cover_original_song_title: null,
  cover_original_artist: null,
  is_owned_by_user: false
}

export const newTrackMetadata = (
  fields?: any,
  validate = false
): WriteableTrackMetadata => {
  const validFields = validate
    ? pick(fields, Object.keys(trackMetadataSchema).concat(['track_id']))
    : fields
  const remixParentTrackId = fields?.remix_of?.tracks?.[0]?.parent_track_id
  return {
    ...trackMetadataSchema,
    track_segments: [...trackMetadataSchema.track_segments],
    followee_reposts: [...(trackMetadataSchema.followee_reposts || [])],
    followee_saves: [...(trackMetadataSchema.followee_saves || [])],
    ...validFields,
    // Reformat remixes last so we don't carry through any extra metadata that
    // was part of the remix_of response from backends
    remix_of: remixParentTrackId
      ? createRemixOfMetadata({ parentTrackId: remixParentTrackId })
      : null
  }
}

const collectionMetadataSchema = {
  is_album: false,
  is_current: true,
  is_private: true,
  tags: null,
  genre: null,
  mood: null,
  created_at: null,
  updated_at: null,
  cover_art: null,
  cover_art_sizes: null,
  playlist_name: '',
  playlist_owner_id: null,
  save_count: null,
  license: null,
  upc: null,
  description: null,
  ddex_release_ids: null,
  ddex_app: null,
  artists: null,
  copyright_line: null,
  producer_copyright_line: null,
  parental_warning_type: null
}

export const newCollectionMetadata = (fields?: any, validate = false) => {
  const validFields = validate
    ? pick(
        fields,
        Object.keys(collectionMetadataSchema).concat(['playlist_id'])
      )
    : fields
  return {
    ...collectionMetadataSchema,
    ...validFields
  }
}

const userMetadataSchema = {
  wallet: '',
  name: null,
  handle: '',
  profile_picture: null,
  profile_picture_sizes: null,
  cover_photo_sizes: null,
  cover_photo: null,
  bio: null,
  location: null,
  is_verified: false,
  twitter_handle: null,
  instagram_handle: null,
  tiktok_handle: null,
  website: null,
  donation: null,
  creator_node_endpoint: null,
  updated_at: null,
  playlist_library: null,
  events: null,
  is_deactivated: false,
  artist_pick_track_id: null,
  coin_flair_mint: null,
  spl_usdc_payout_wallet: null
}

export const newUserMetadata = (
  fields?: any,
  validate = false
): WriteableUserMetadata => {
  const validFields = validate
    ? pick(fields, Object.keys(userMetadataSchema).concat(['user_id']))
    : fields
  return {
    ...userMetadataSchema,
    ...validFields
  }
}

export const createRemixOfMetadata = ({
  parentTrackId
}: {
  parentTrackId: number
}) => {
  return {
    tracks: [
      {
        parent_track_id: parentTrackId
      }
    ]
  }
}
