import { Collection, FieldVisibility, Track, User } from '@audius/common/models'
import { TQCollection } from '@audius/common/src/api/tan-query/models'
import { Genre } from '@audius/common/utils'

const defaultFieldVisibility: FieldVisibility = {
  genre: true,
  mood: true,
  tags: true,
  share: true,
  play_count: true,
  remixes: true
}

export const getTrackWithFallback = (track: Track | null | undefined) => {
  return (
    track || {
      track_id: -1,
      title: '',
      permalink: '',
      repost_count: 0,
      followee_reposts: [],
      followee_saves: [],
      duration: 0,
      save_count: 0,
      genre: Genre.ALL,
      field_visibility: defaultFieldVisibility,
      has_current_user_reposted: false,
      has_current_user_saved: false,
      play_count: 0,
      is_delete: false,
      is_unlisted: false,
      is_scheduled_release: false,
      is_stream_gated: false,
      stream_conditions: null,
      is_download_gated: false,
      download_conditions: null,
      preview_cid: null,
      orig_file_cid: '',
      orig_filename: '',
      is_downloadable: false,
      is_original_available: false,
      activity_timestamp: '',
      _co_sign: undefined,
      release_date: '',
      ddex_app: null,
      comment_count: 0,
      comments_disabled: false,
      album_backlink: undefined,
      access: {
        stream: false,
        download: false
      }
    }
  )
}

export const getCollectionWithFallback = (
  collection: Partial<TQCollection> | Collection | null | undefined
) => {
  return {
    playlist_id: -1,
    playlist_name: '',
    repost_count: 0,
    save_count: 0,
    track_ids: [],
    track_count: 0,
    followee_reposts: [],
    followee_saves: [],
    has_current_user_reposted: false,
    has_current_user_saved: false,
    is_private: true,
    is_album: false,
    is_delete: false,
    permalink: '',
    activity_timestamp: '',
    _co_sign: undefined,
    playlist_owner_id: -1,
    is_stream_gated: false,
    stream_conditions: null,
    access: {
      stream: false,
      download: false
    },
    ...collection
  }
}

export const getUserWithFallback = (user: Partial<User> | null | undefined) => {
  return {
    artist_pick_track_id: -1,
    name: '',
    handle: '',
    is_verified: false,
    is_deactivated: false,
    user_id: -1,
    ...user
  }
}
