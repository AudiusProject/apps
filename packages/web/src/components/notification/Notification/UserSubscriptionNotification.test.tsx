import {
  Entity,
  NotificationType,
  Notification as NotificationObjectType
} from '@audius/common/store'
import { Text } from '@audius/harmony'
import { Id, developmentConfig } from '@audius/sdk'
import { http, HttpResponse } from 'msw'
import { Routes, Route } from 'react-router-dom-v5-compat'
import {
  describe,
  expect,
  it,
  beforeAll,
  afterEach,
  afterAll,
  vi
} from 'vitest'

import { mswServer, render, screen } from 'test/test-utils'

import { Notification } from './Notification'

const { apiEndpoint } = developmentConfig.network

// Mock data for a user who posted a track
const mockUser = {
  album_count: 0,
  bio: null,
  follower_count: 0,
  followee_count: 5,
  handle: 'pounsoudnowuadawd',
  id: Id.parse(123),
  user_id: Id.parse(123),
  is_verified: false,
  twitter_handle: null,
  instagram_handle: null,
  tiktok_handle: null,
  verified_with_twitter: false,
  verified_with_instagram: false,
  verified_with_tiktok: false,
  website: null,
  location: 'Austin, TX',
  name: 'awdawd123123123',
  playlist_count: 0,
  repost_count: 0,
  track_count: 0,
  is_deactivated: false,
  is_available: true,
  erc_wallet: '0x97125b412d45ece99d3d5464a2e31d91a33a933d',
  spl_wallet: null,
  spl_usdc_payout_wallet: null,
  supporter_count: 0,
  supporting_count: 0,
  wallet: '0x97125b412d45ece99d3d5464a2e31d91a33a933d',
  balance: null,
  associated_wallets_balance: null,
  total_balance: '0',
  total_audio_balance: 0,
  payout_wallet: '',
  waudio_balance: '0',
  associated_sol_wallets_balance: '0',
  blocknumber: 104270038,
  created_at: '2025-05-29T18:56:26Z',
  is_storage_v2: true,
  creator_node_endpoint: null,
  current_user_followee_follow_count: 10,
  does_current_user_follow: false,
  does_current_user_subscribe: false,
  does_follow_current_user: false,
  handle_lc: 'pounsoudnowuadawd',
  updated_at: '2025-05-30T16:31:00Z',
  cover_photo_sizes: null,
  cover_photo_cids: null,
  cover_photo_legacy: null,
  profile_picture_sizes: '01JWEPE58J4MS4JJXE720W939N',
  profile_picture_cids: null,
  profile_picture_legacy: null,
  artist_pick_track_id: null,
  profile_picture: {
    '150x150':
      'https://creatornode7.staging.audius.co/content/01JWEPE58J4MS4JJXE720W939N/150x150.jpg',
    '480x480':
      'https://creatornode7.staging.audius.co/content/01JWEPE58J4MS4JJXE720W939N/480x480.jpg',
    '1000x1000':
      'https://creatornode7.staging.audius.co/content/01JWEPE58J4MS4JJXE720W939N/1000x1000.jpg',
    mirrors: [
      'https://creatornode6.staging.audius.co',
      'https://creatornode11.staging.audius.co'
    ]
  },
  cover_photo: null
}

// Mock data for a track
const mockTrack = {
  track_id: Id.parse(456),
  description: '',
  genre: 'Electronic',
  id: Id.parse(456),
  track_cid: 'baeaaaiqsebyhe73ghe7mofmalygoxyglrqyoj54m3b5v6xmpv5iwxispq47yw',
  preview_cid: null,
  orig_file_cid:
    'baeaaaiqseazky4bfpt4bbjpzqsamxm7zdpim6igi3yl3bvvm5riqjeol7vqje',
  orig_filename: 'a-little-gambling copy 4.mp3',
  is_original_available: false,
  mood: null,
  release_date: '2025-05-30T17:37:56Z',
  repost_count: 0,
  favorite_count: 0,
  comment_count: 0,
  tags: '',
  title: 'a-little-gambling copy 4',
  slug: 'a-little-gambling-copy-4',
  duration: 82,
  is_downloadable: false,
  play_count: 3,
  ddex_app: '',
  pinned_comment_id: null,
  playlists_containing_track: [],
  playlists_previously_containing_track: {},
  album_backlink: null,
  blocknumber: 2,
  create_date: null,
  created_at: '2025-05-30T17:37:56Z',
  cover_art_sizes: '01JWH4AVBRSH9PAKB5RDGGKDC1',
  credits_splits: null,
  isrc: '',
  license: null,
  iswc: '',
  field_visibility: {
    mood: true,
    tags: true,
    genre: true,
    share: true,
    remixes: true,
    play_count: true
  },
  has_current_user_reposted: false,
  has_current_user_saved: false,
  is_scheduled_release: false,
  is_unlisted: false,
  stem_of: null,
  track_segments: [],
  updated_at: '2025-05-30T17:37:56Z',
  is_delete: false,
  cover_art: null,
  is_available: true,
  allowed_api_keys: null,
  audio_upload_id: '01JWH4AVTKEZTA3P5B7744EKXW',
  preview_start_seconds: null,
  bpm: 103.7,
  is_custom_bpm: false,
  musical_key: 'C minor',
  is_custom_musical_key: false,
  audio_analysis_error_count: 0,
  comments_disabled: false,
  ddex_release_ids: null,
  artists: null,
  resource_contributors: null,
  indirect_resource_contributors: null,
  rights_controller: null,
  copyright_line: null,
  producer_copyright_line: null,
  parental_warning_type: null,
  is_stream_gated: false,
  is_download_gated: false,
  cover_original_song_title: null,
  cover_original_artist: null,
  is_owned_by_user: false,
  permalink: '/adacawe123123123/a-little-gambling-copy-4',
  is_streamable: true,
  artwork: {
    '150x150':
      'https://creatornode9.staging.audius.co/content/01JWH4AVBRSH9PAKB5RDGGKDC1/150x150.jpg',
    '480x480':
      'https://creatornode9.staging.audius.co/content/01JWH4AVBRSH9PAKB5RDGGKDC1/480x480.jpg',
    '1000x1000':
      'https://creatornode9.staging.audius.co/content/01JWH4AVBRSH9PAKB5RDGGKDC1/1000x1000.jpg',
    mirrors: [
      'https://creatornode6.staging.audius.co',
      'https://creatornode5.staging.audius.co'
    ]
  },
  stream: {
    url: 'https://creatornode5.staging.audius.co/tracks/cidstream/baeaaaiqsebyhe73ghe7mofmalygoxyglrqyoj54m3b5v6xmpv5iwxispq47yw?signature=%7B%22data%22%3A%22%7B%5C%22cid%5C%22%3A%5C%22baeaaaiqsebyhe73ghe7mofmalygoxyglrqyoj54m3b5v6xmpv5iwxispq47yw%5C%22%2C%5C%22timestamp%5C%22%3A1748629534000%2C%5C%22trackId%5C%22%3A2043892300%2C%5C%22userId%5C%22%3A19124940%7D%22%2C%22signature%22%3A%220xdf923da5404faaee2982863fc048b83339c8241a26556d865b134879e212132528bafd01aa6989bec7bf700b3e110d505d34df269b1ab3d1efe261bab9af4d4a00%22%7D',
    mirrors: [
      'https://creatornode7.staging.audius.co',
      'https://creatornode11.staging.audius.co'
    ]
  },
  download: null,
  preview: null,
  user_id: Id.parse(123),
  access: {
    stream: true,
    download: true
  },
  followee_reposts: [],
  followee_favorites: [],
  remix_of: {
    tracks: []
  },
  stream_conditions: null,
  download_conditions: null,
  user: mockUser
}

// Mock notification data
// TODO: make a factory to generate more notif types
const mockNotification: NotificationObjectType = {
  id: 'timestamp:1748626676:group_id:create:track:user_id:123',
  groupId: 'create:track:user_id:123',
  type: NotificationType.UserSubscription as const,
  entityType: Entity.Track,
  entityIds: [456],
  userId: 123,
  timeLabel: '2 hours ago',
  isViewed: true,
  timestamp: 1748626676
}

const renderNotification = (notification: NotificationObjectType) => {
  // Mock API responses
  mswServer.use(
    http.get(`${apiEndpoint}/v1/full/users`, () => {
      return HttpResponse.json({ data: [mockUser] })
    }),
    http.get(`${apiEndpoint}/v1/full/tracks`, () => {
      return HttpResponse.json({ data: [mockTrack] })
    })
  )

  return render(
    <Routes>
      <Route path='/' element={<Notification notification={notification} />} />
      <Route
        path={mockTrack.permalink}
        element={<Text variant='heading'>{mockTrack.title} page</Text>}
      />
    </Routes>
  )
}

describe('UserSubscriptionNotification', () => {
  beforeAll(() => {
    mswServer.listen()
  })

  afterEach(() => {
    mswServer.resetHandlers()
    vi.clearAllMocks()
  })

  afterAll(() => {
    mswServer.close()
  })

  it('renders notification and links to track page correctly', async () => {
    renderNotification(mockNotification)

    // Check that the notification title is rendered
    expect(await screen.findByText('New Release')).toBeInTheDocument()

    // Check that the artist's name is rendered
    expect(await screen.findByText(mockUser.name)).toBeInTheDocument()

    // Check for the time label in the footer
    expect(
      await screen.findByText(mockNotification.timeLabel!)
    ).toBeInTheDocument()

    // Check that the track link with the title in it is rendered
    const trackLink = await screen.findByText(mockTrack.title)
    expect(trackLink).toBeInTheDocument()

    // Click the link and check that it goes to the correct page
    trackLink.click()
    expect(
      await screen.findByText(`${mockTrack.title} page`)
    ).toBeInTheDocument()
  })
})
