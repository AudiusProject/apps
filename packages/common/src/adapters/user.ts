import {
  HashId,
  OptionalHashId,
  OptionalId,
  type full,
  type User,
  type UpdateUserRequest
} from '@audius/sdk'
import camelcaseKeys from 'camelcase-keys'
import { omit, pick } from 'lodash'
import snakecaseKeys from 'snakecase-keys'

import {
  AccountUserMetadata,
  ManagedUserMetadata,
  UserManagerMetadata,
  UserMetadata,
  WriteableUserMetadata
} from '~/models/User'
import { SolanaWalletAddress, StringWei } from '~/models/Wallet'
import { removeNullable } from '~/utils/typeUtils'

import { accountCollectionFromSDK } from './collection'
import { grantFromSDK } from './grant'
import {
  coverPhotoSizesCIDsFromSDK,
  profilePictureSizesCIDsFromSDK
} from './imageSize'
import { playlistLibraryFromSDK } from './playlistLibrary'
import { transformAndCleanList } from './utils'

/** Converts a SDK `User` response to a UserMetadata. Note: Will _not_ include the "current user" fields as those aren't returned by the Users API */
export const userMetadataFromSDK = (
  input: User | full.UserFull
): UserMetadata | undefined => {
  const decodedUserId = OptionalHashId.parse(input.id)
  if (!decodedUserId) {
    return undefined
  }

  // Type guard to check if coverPhoto has mirrors (full SDK type)
  const hasMirrors = (
    photo: User['coverPhoto'] | full.UserFull['coverPhoto']
  ): photo is full.CoverPhotoFull => {
    return photo !== null && photo !== undefined && 'mirrors' in photo
  }

  // Type guard to check if profilePicture has mirrors (full SDK type)
  const hasProfileMirrors = (
    picture: User['profilePicture'] | full.UserFull['profilePicture']
  ): picture is full.ProfilePictureFull => {
    return picture !== null && picture !== undefined && 'mirrors' in picture
  }

  // Type guard for artistCoinBadge
  const isFullArtistCoinBadge = (
    badge: User['artistCoinBadge'] | full.UserFull['artistCoinBadge']
  ): badge is full.UserFullArtistCoinBadge => {
    return (
      badge !== null &&
      badge !== undefined &&
      typeof badge === 'object' &&
      'mint' in badge &&
      'logoUri' in badge &&
      'ticker' in badge
    )
  }

  const newUser: UserMetadata = {
    // Fields from API that are omitted in this model
    ...omit(snakecaseKeys(input), [
      'id',
      'cover_photo_legacy',
      'profile_picture_legacy',
      'artist_coin_badge'
    ]),

    // Conversions
    artist_pick_track_id: input.artistPickTrackId
      ? HashId.parse(input.artistPickTrackId)
      : null,

    // Nested Types
    cover_photo_cids: input.coverPhotoCids
      ? coverPhotoSizesCIDsFromSDK(input.coverPhotoCids)
      : null,
    profile_picture_cids: input.profilePictureCids
      ? profilePictureSizesCIDsFromSDK(input.profilePictureCids)
      : null,

    // Re-types
    balance: input.balance as StringWei,
    associated_wallets_balance: input.associatedWalletsBalance as StringWei,
    total_balance: input.totalBalance as StringWei,
    user_id: decodedUserId,
    album_count: input.albumCount ?? 0,
    follower_count: input.followerCount ?? 0,
    followee_count: input.followeeCount ?? 0,
    handle: input.handle ?? '',
    handle_lc: input.handleLc ?? input.handle?.toLowerCase() ?? '',
    is_deactivated: input.isDeactivated ?? false,
    is_verified: input.isVerified ?? false,
    verified_with_twitter: input.verifiedWithTwitter ?? false,
    verified_with_instagram: input.verifiedWithInstagram ?? false,
    verified_with_tiktok: input.verifiedWithTiktok ?? false,
    name: input.name ?? '',
    playlist_count: input.playlistCount ?? 0,
    repost_count: input.repostCount ?? 0,
    track_count: input.trackCount ?? 0,
    created_at: input.createdAt ? new Date(input.createdAt).toISOString() : '',
    updated_at: input.updatedAt ? new Date(input.updatedAt).toISOString() : '',
    spl_wallet: input.splWallet as SolanaWalletAddress,
    spl_usdc_payout_wallet: input.splUsdcPayoutWallet as SolanaWalletAddress,
    blocknumber: input.blocknumber ?? 0,
    current_user_followee_follow_count:
      input.currentUserFolloweeFollowCount ?? 0,
    does_current_user_follow: input.doesCurrentUserFollow ?? false,
    does_follow_current_user: input.doesFollowCurrentUser ?? false,
    cover_photo: input.coverPhoto
      ? {
          '640x': input.coverPhoto._640x,
          '2000x': input.coverPhoto._2000x,
          ...(hasMirrors(input.coverPhoto)
            ? { mirrors: input.coverPhoto.mirrors }
            : {})
        }
      : {},
    profile_picture: input.profilePicture
      ? {
          '150x150': input.profilePicture._150x150,
          '480x480': input.profilePicture._480x480,
          '1000x1000': input.profilePicture._1000x1000,
          ...(hasProfileMirrors(input.profilePicture)
            ? { mirrors: input.profilePicture.mirrors }
            : {})
        }
      : {},
    // Required Nullable fields
    bio: input.bio ?? null,
    twitter_handle: input.twitterHandle ?? null,
    instagram_handle: input.instagramHandle ?? null,
    tiktok_handle: input.tiktokHandle ?? null,
    website: input.website ?? null,
    profile_type: input.profileType === 'label' ? 'label' : null,
    cover_photo_sizes: input.coverPhotoSizes ?? null,
    creator_node_endpoint: input.creatorNodeEndpoint ?? null,
    location: input.location ?? null,
    profile_picture_sizes: input.profilePictureSizes ?? null,

    // Explicit handling for artist_coin_badge to convert nested logoUri to logo_uri
    artist_coin_badge: isFullArtistCoinBadge(input.artistCoinBadge)
      ? {
          mint: input.artistCoinBadge.mint ?? '',
          logo_uri: input.artistCoinBadge.logoUri ?? '',
          ticker: input.artistCoinBadge.ticker ?? ''
        }
      : null
  }

  return newUser
}

export const userMetadataListFromSDK = (input?: (User | full.UserFull)[]) =>
  input ? input.map((d) => userMetadataFromSDK(d)).filter(removeNullable) : []

export const managedUserFromSDK = (
  input: full.ManagedUser
): ManagedUserMetadata | undefined => {
  const user = userMetadataFromSDK(input.user)
  if (!user) {
    return undefined
  }
  return {
    user,
    grant: grantFromSDK(input.grant)
  }
}

export const managedUserListFromSDK = (input?: full.ManagedUser[]) =>
  input ? input.map((d) => managedUserFromSDK(d)).filter(removeNullable) : []

export const userManagerFromSDK = (
  input: full.UserManager
): UserManagerMetadata | undefined => {
  const manager = userMetadataFromSDK(input.manager)
  if (!manager) {
    return undefined
  }
  return {
    manager,
    grant: grantFromSDK(input.grant)
  }
}

export const userManagerListFromSDK = (input?: full.UserManager[]) =>
  input ? input.map((d) => userManagerFromSDK(d)).filter(removeNullable) : []

export const accountFromSDK = (
  input: full.AccountFull
): AccountUserMetadata | undefined => {
  const user = userMetadataFromSDK(input.user)
  if (!user) {
    return undefined
  }
  const accountMetadata = {
    playlists: transformAndCleanList(input.playlists, accountCollectionFromSDK),
    playlist_library: playlistLibraryFromSDK(input.playlistLibrary) ?? null,
    track_save_count: input.trackSaveCount
  }
  return {
    // Account users included extended information, so we'll merge that in here.
    user: {
      ...user,
      playlists: accountMetadata.playlists
    },
    // These values are included outside the user as well to facilitate separate caching
    ...accountMetadata
  }
}

export const userMetadataToSdk = (
  input: WriteableUserMetadata & Pick<AccountUserMetadata, 'playlist_library'>
): UpdateUserRequest['metadata'] => ({
  ...camelcaseKeys(
    pick(input, [
      'name',
      'handle',
      'is_deactivated',
      'profile_type',
      'spl_usdc_payout_wallet',
      'coin_flair_mint'
    ])
  ),
  bio: input.bio ?? undefined,
  website: input.website ?? undefined,
  artistPickTrackId: OptionalId.parse(input.artist_pick_track_id ?? undefined),
  events: {
    referrer: input.events?.referrer ?? undefined,
    isMobileUser: input.events?.is_mobile_user ?? undefined
  },
  location: input.location ?? undefined,
  twitterHandle: input.twitter_handle ?? undefined,
  instagramHandle: input.instagram_handle ?? undefined,
  playlistLibrary: input.playlist_library ?? undefined,
  tiktokHandle: input.tiktok_handle ?? undefined
})
