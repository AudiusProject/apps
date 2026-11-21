import { AccountCollection, ID, PlaylistLibrary, Status } from '~/models'
import { Nullable } from '~/utils/typeUtils'

type AccountPayload<Profile> = {
  uuid: string
  profile: Profile
}

export type TwitterAccountPayload = AccountPayload<TwitterProfile>
export type InstagramAccountPayload = AccountPayload<InstagramProfile>
export type TikTokAccountPayload = AccountPayload<TikTokProfile>

export type InstagramProfile = {
  id: string
  username: string
  biography?: string
  business_email?: string
  edge_follow?: { count: number }
  edge_followed_by?: { count: number }
  external_url?: string
  full_name?: string
  is_business_account?: boolean
  is_private?: boolean
  is_verified: boolean
  profile_pic_url?: string
  profile_pic_url_hd?: string
}

export type TwitterProfile = {
  screen_name: string
  name: string
  verified: boolean
  profile_image_url_https: string
  profile_banner_url?: string
}

export type TikTokProfile = {
  open_id: string
  username: string
  display_name: string
  avatar_large_url?: string
  is_verified: boolean
}

type FailureReason =
  | 'ACCOUNT_DEACTIVATED'
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_NOT_FOUND_LOCAL'

export type AccountState = {
  collections: { [id: number]: AccountCollection }
  userId: Nullable<number>
  hasTracks: Nullable<boolean>
  status: Status
  reason: Nullable<FailureReason>
  connectivityFailure: boolean
  needsAccountRecovery: boolean
  walletAddresses: {
    currentUser: string | null
    web3User: string | null
  }
  playlistLibrary: Nullable<PlaylistLibrary>
  trackSaveCount: Nullable<number>
  guestEmail: Nullable<string>
}

export type FetchAccountFailedPayload = {
  reason: FailureReason
}

export type RenameAccountPlaylistPayload = {
  collectionId: ID
  name: string
}
