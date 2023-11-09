import type { CSSObject } from '@emotion/react'

import { IconInstagram, IconTikTok, IconTwitter } from 'icons'

import { Button } from '../Button/Button'
import type { ButtonProps } from '../types'

type SocialMedia = 'tiktok' | 'instagram' | 'twitter'

// Omitting aria-label from original type purely for showing in Storybook
export type SocialButtonProps = Omit<ButtonProps, 'aria-label'> & {
  /**
   * Which social media.
   */
  socialType: SocialMedia
  /**
   * Aria label text. Required since these buttons just have icons
   */
  'aria-label': string
}

const getButtonLogo = (type: SocialMedia) => {
  switch (type) {
    case 'instagram':
      return <IconInstagram color='staticWhite' size='l' />
    case 'tiktok':
      return <IconTikTok color='staticWhite' size='l' />
    case 'twitter':
      return <IconTwitter color='staticWhite' size='l' />
    default:
      return undefined
  }
}

const getSocialButtonProps = (type: SocialMedia): ButtonProps => {
  switch (type) {
    case 'tiktok':
      return { hexColor: '#fe2c55' }
    case 'twitter':
      return { hexColor: '#1ba1f1' }
    default:
      return {}
  }
}

export const SocialButton = (props: SocialButtonProps) => {
  const { socialType, ...rest } = props
  const socialButtonProps = getSocialButtonProps(socialType)

  const instagramBackgroundCss: CSSObject = {
    background: `radial-gradient(61.46% 59.09% at 36.25% 96.55%, #ffd600 0%, #ff6930 48.44%, #fe3b36 73.44%, rgba(254, 59, 54, 0) 100%),
      radial-gradient(202.83% 136.37% at 84.5% 113.5%, #ff1b90 24.39%, #f80261 43.67%, #ed00c0 68.85%, #c500e9 77.68%, #7017ff 89.32%)`
  }

  return (
    <Button
      {...socialButtonProps}
      {...rest}
      css={{
        border: 'transparent',
        ...(socialType === 'instagram' && instagramBackgroundCss)
      }}
    >
      {getButtonLogo(socialType)}
    </Button>
  )
}
