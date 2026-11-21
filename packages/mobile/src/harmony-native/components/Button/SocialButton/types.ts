import type { ButtonProps } from '../Button/types'

export type SocialMedia = 'tiktok' | 'instagram' | 'x'

export type SocialButtonProps = ButtonProps & {
  socialType: SocialMedia

  'aria-label': string
}
