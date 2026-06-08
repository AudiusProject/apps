import type { Nullable } from '@audius/common/utils'

import type { Image } from 'app/types/image'

export type FanClubBadge = {
  mint: string
  logo_uri: string
  ticker: string
}

export type ProfileValues = {
  name: string
  bio: Nullable<string>
  location: Nullable<string>
  twitter_handle: Nullable<string>
  instagram_handle: Nullable<string>
  tiktok_handle: Nullable<string>
  website: Nullable<string>
  fan_club_badge: Nullable<FanClubBadge>
  cover_photo: Image
  profile_picture: Image
}

export type UpdatedProfile = Omit<
  ProfileValues,
  'cover_photo' | 'profile_picture'
> & {
  updatedCoverPhoto?: Image
  updatedProfilePicture?: Image
}
