import { TikTokProfile } from '~/store/account/types'

export const MAX_HANDLE_LENGTH = 30
export const MAX_DISPLAY_NAME_LENGTH = 32
export const MAX_BIO_LENGTH = 256

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
