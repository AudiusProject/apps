import { SquareSizes, WidthSizes } from '@audius/common/models'
import { Id, developmentConfig } from '@audius/sdk'
const { apiEndpoint } = developmentConfig.network

export const artistUser = {
  id: Id.parse(1),
  handle: 'test-user',
  name: 'Test User',
  profile_picture: {
    [SquareSizes.SIZE_150_BY_150]: `${apiEndpoint}/image-profile-small.jpg`,
    [SquareSizes.SIZE_480_BY_480]: `${apiEndpoint}/image-profile-medium.jpg`,
    mirrors: [apiEndpoint]
  },
  follower_count: 1230,
  followee_count: 234,
  track_count: 37,
  playlist_count: 2,
  repost_count: 34,
  album_count: 4,
  bio: 'Artist bio',
  cover_photo: {
    [WidthSizes.SIZE_2000]: `${apiEndpoint}/image-cover.jpg`,
    mirrors: [apiEndpoint]
  },
  is_verified: true,
  is_deactivated: false,
  is_available: true,
  erc_wallet: '0x123',
  spl_wallet: '0x456',
  wallet: '0x123',
  balance: '0',
  associated_wallets_balance: '0',
  total_balance: '0',
  waudio_balance: '0',
  associated_sol_wallets_balance: '0',
  blocknumber: 2,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  is_storage_v2: true,
  handle_lc: 'test-artist',
  has_collectibles: false,
  allow_ai_attribution: false
}

export const nonArtistUser = {
  id: Id.parse(2),
  handle: 'test-user',
  name: 'Test User',
  profile_picture: {
    [SquareSizes.SIZE_150_BY_150]: `${apiEndpoint}/image-profile-small.jpg`,
    [SquareSizes.SIZE_480_BY_480]: `${apiEndpoint}/image-profile-medium.jpg`,
    mirrors: [apiEndpoint]
  },
  follower_count: 1,
  followee_count: 2,
  track_count: 0,
  playlist_count: 3,
  repost_count: 4,
  album_count: 0,
  bio: 'Test bio',
  cover_photo: {
    [WidthSizes.SIZE_2000]: `${apiEndpoint}/image-cover.jpg`,
    mirrors: [apiEndpoint]
  },
  is_verified: false,
  is_deactivated: false,
  is_available: true,
  erc_wallet: '0x123',
  spl_wallet: '0x456',
  wallet: '0x123',
  balance: '0',
  associated_wallets_balance: '0',
  total_balance: '0',
  waudio_balance: '0',
  associated_sol_wallets_balance: '0',
  blocknumber: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  is_storage_v2: true,
  handle_lc: 'test-user',
  has_collectibles: false,
  allow_ai_attribution: false
}
