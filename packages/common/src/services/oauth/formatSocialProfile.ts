import { TikTokProfile, TwitterProfile } from '~/store/account/types'

export const MAX_HANDLE_LENGTH = 30
export const MAX_DISPLAY_NAME_LENGTH = 32

export const formatTwitterProfile = async (
  twitterProfile: TwitterProfile,
  resizeImage: (
    image: File,
    maxWidth?: number,
    square?: boolean,
    key?: string
  ) => Promise<File>
) => {
  const profileUrl = twitterProfile.profile_image_url_https.replace(
    /_(normal|bigger|mini)/g,
    ''
  )
  const imageBlob = await fetch(profileUrl).then((r) => r.blob())
  const artworkFile = new File([imageBlob], 'Artwork', {
    type: 'image/jpeg'
  })
  const file = await resizeImage(artworkFile)
  const url = URL.createObjectURL(file)

  let bannerUrl, bannerFile
  if (twitterProfile.profile_banner_url) {
    const bannerImageBlob = await fetch(twitterProfile.profile_banner_url).then(
      (r) => r.blob()
    )
    const bannerArtworkFile = new File([bannerImageBlob], 'Artwork', {
      type: 'image/webp'
    })
    bannerFile = await resizeImage(bannerArtworkFile, 2000, false)
    bannerUrl = URL.createObjectURL(bannerFile)
  }
  // Truncate to MAX_HANDLE_LENGTH characters because we don't support longer handles.
  // If the user is verifed, they won't be able to claim the status if
  // the handle doesn't match, so just pass through.
  let requiresUserReview = false
  let handleTooLong = false

  if (twitterProfile.screen_name.length > MAX_HANDLE_LENGTH) {
    requiresUserReview = true
    handleTooLong = true
    if (!twitterProfile.verified) {
      twitterProfile.screen_name = twitterProfile.screen_name.slice(
        0,
        MAX_HANDLE_LENGTH
      )
    }
  }
  if (twitterProfile.name.length > MAX_DISPLAY_NAME_LENGTH) {
    requiresUserReview = true
    twitterProfile.name = twitterProfile.name.slice(0, MAX_DISPLAY_NAME_LENGTH)
  }

  return {
    profile: twitterProfile,
    profileImage: { url, file },
    profileBanner: bannerUrl ? { url: bannerUrl, file: bannerFile } : undefined,
    requiresUserReview,
    handleTooLong
  }
}

export const formatTikTokProfile = async (
  tikTokProfile: TikTokProfile,
  resizeImage: (
    image: File,
    maxWidth?: number,
    square?: boolean,
    key?: string
  ) => Promise<File>
) => {
  const getProfilePicture = async () => {
    try {
      if (tikTokProfile.avatar_large_url) {
        const imageBlob = await fetch(tikTokProfile.avatar_large_url).then(
          (r) => r.blob()
        )
        const artworkFile = new File([imageBlob], 'Artwork', {
          type: 'image/jpeg'
        })
        const file = await resizeImage(artworkFile)
        const url = URL.createObjectURL(file)
        return { url, file }
      }
    } catch (e) {
      console.error('Failed to fetch avatar_large_url', e)
    }

    return undefined
  }

  const profilePicture = await getProfilePicture()

  // Truncate to MAX_HANDLE_LENGTH characters because we don't support longer handles.
  // If the user is verifed, they won't be able to claim the status if
  // the handle doesn't match, so just pass through.
  let requiresUserReview = false
  let handleTooLong = false
  if (tikTokProfile.username.length > MAX_HANDLE_LENGTH) {
    requiresUserReview = true
    handleTooLong = true
    if (!tikTokProfile.is_verified) {
      tikTokProfile.username = tikTokProfile.username.slice(
        0,
        MAX_HANDLE_LENGTH
      )
    }
  }

  return {
    profile: tikTokProfile,
    profileImage: profilePicture,
    profileBanner: undefined,
    requiresUserReview,
    handleTooLong
  }
}

export type TikTokProfileData = Awaited<ReturnType<typeof formatTikTokProfile>>
