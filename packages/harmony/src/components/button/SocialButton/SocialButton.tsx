import type { CSSObject } from '@emotion/react'

import { IconInstagram, IconTikTok, IconX } from '~harmony/icons'

import { Button } from '../Button/Button'
import type { ButtonProps } from '../Button/types'

type SocialMedia = 'tiktok' | 'instagram' | 'x'

// Omitting aria-label from original type for development purposes
export type SocialButtonProps = ButtonProps & {
  /**
   * Which social media.
   */
  socialType: SocialMedia
}

const getSocialLogos = () => ({
  tiktok: IconTikTok,
  instagram: IconInstagram,
  x: IconX
})

export const SocialButton = (props: SocialButtonProps) => {
  const { socialType, ...rest } = props

  const instagramBackgroundCss: CSSObject = {
    background: `radial-gradient(61.46% 59.09% at 36.25% 96.55%, #ffd600 0%, #ff6930 48.44%, #fe3b36 73.44%, rgba(254, 59, 54, 0) 100%),
      radial-gradient(202.83% 136.37% at 84.5% 113.5%, #ff1b90 24.39%, #f80261 43.67%, #ed00c0 68.85%, #c500e9 77.68%, #7017ff 89.32%)`
  }

  const SocialLogo = getSocialLogos()[socialType]

  return (
    <Button
      variant='secondary'
      {...rest}
      css={{
        border: 'transparent',
        ...(socialType === 'instagram' && instagramBackgroundCss),
        ...(socialType === 'tiktok' && {
          background: '#fe2c55',
          color: '#ffffff'
        })
      }}
      iconLeft={SocialLogo}
    />
  )
}
