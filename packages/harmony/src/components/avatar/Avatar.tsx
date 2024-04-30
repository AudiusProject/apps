import { Artwork, ArtworkProps } from '../artwork'

type ArtworkInnerProps = Omit<ArtworkProps, 'borderWidth'>

export type AvatarProps = ArtworkInnerProps & {
  variant?: 'default' | 'strong'
  size?: 'auto' | 'small' | 'medium' | 'large' | 'xl' | 'xxl'
  borderWidth?: 'thin' | 'default'
  // onClick?: (e: React.MouseEvent<HTMLDivElement>) => void
}

const sizeMap = {
  auto: '100%',
  small: 24,
  medium: 40,
  large: 72,
  xl: 80,
  xxl: 120
}

const borderWidthMap = {
  thin: 1.2,
  default: 2
}

export const Avatar = (props: AvatarProps) => {
  const { variant, size = 'auto', borderWidth = 'default', ...other } = props

  return (
    <Artwork
      borderRadius='circle'
      h={sizeMap[size]}
      w={sizeMap[size]}
      shadow={variant === 'strong' ? 'emphasis' : 'flat'}
      borderWidth={borderWidthMap[borderWidth]}
      css={variant === 'strong' ? { zIndex: 1 } : undefined}
      {...other}
    />
  )
}
