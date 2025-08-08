import { SocialPlatform } from '~/models'
import { formatCapitalizeString } from '~/utils'

export const socialMediaMessages = {
  verificationError:
    'Something went wrong. Please try again or verify with another account.',
  accountInUseError: (platform: SocialPlatform) =>
    `An Audius account with that ${formatCapitalizeString(
      platform
    )} account already exists. Please sign in.`,
  socialMediaLoginSucess: (platform: SocialPlatform) => {
    const platformName = {
      x: 'X',
      instagram: 'Instagram',
      tiktok: 'TikTok'
    }[platform]
    return `${platformName} connection successful!`
  },
  signUpX: 'Sign up with X',
  signUpInstagram: 'Sign up with Instagram',
  signUpTikTok: 'Sign up with TikTok'
}
