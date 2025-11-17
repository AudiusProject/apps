import { Id } from '@audius/sdk'

import { artistUser } from './users'

export const testTrack = {
  id: Id.parse(1),
  track_id: Id.parse(1),
  user_id: artistUser.id,
  genre: 'Electronic',
  title: 'Test Track',
  user: artistUser,
  duration: 180,
  repost_count: 5,
  favorite_count: 10,
  comment_count: 15,
  permalink: '/test-user/test-track',
  is_delete: false,
  is_stream_gated: false,
  is_unlisted: false,
  has_current_user_reposted: false,
  has_current_user_saved: false,
  preview_cid: 'QmTestPreviewCid',
  _co_sign: null,
  is_owned_by_user: false,
  is_scheduled_release: false,
  is_available: true,
  is_downloadable: true,
  play_count: 1,
  artwork: null,
  followee_reposts: [],
  followee_favorites: [],
  track_segments: [],
  field_visibility: {}
}
