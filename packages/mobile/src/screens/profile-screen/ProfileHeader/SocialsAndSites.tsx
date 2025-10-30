import { Flex } from '@audius/harmony-native'

import {
  InstagramSocialLink,
  TikTokSocialLink,
  XSocialLink,
  WebsiteSocialLink
} from './SocialLink'

export const SocialsAndSites = () => {
  return (
    <Flex pointerEvents='box-none' gap='m'>
      <XSocialLink showText />
      <InstagramSocialLink showText />
      <TikTokSocialLink showText />
      <WebsiteSocialLink showText />
    </Flex>
  )
}
