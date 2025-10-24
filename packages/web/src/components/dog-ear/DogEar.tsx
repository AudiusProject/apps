import { DogEarType } from '@audius/common/models'
import {
  IconSparkles,
  IconCart,
  IconLock,
  IconReceive,
  useTheme,
  ColorTheme,
  Box,
  IconArtistCoin
} from '@audius/harmony'

import Rectangle from 'assets/img/dogEarRectangle.svg'

export type DogEarProps = {
  type: DogEarType
  /** Border width of container surrounding dog ear */
  borderOffset?: number
  className?: string
}

const getIcon = (type: DogEarType) => {
  switch (type) {
    case DogEarType.LOCKED:
      return IconLock
    case DogEarType.USDC_PURCHASE:
      return IconCart
    case DogEarType.USDC_EXTRAS:
      return IconReceive
    case DogEarType.TOKEN_GATED:
      return IconArtistCoin
    case DogEarType.SPECIAL_ACCESS:
    default:
      return IconSparkles
  }
}

const getColor = (type: DogEarType, color: ColorTheme['day']) => {
  switch (type) {
    case DogEarType.SPECIAL_ACCESS:
    case DogEarType.LOCKED:
      return color.special.blue
    case DogEarType.USDC_PURCHASE:
    case DogEarType.USDC_EXTRAS:
      return color.special.lightGreen
    case DogEarType.TOKEN_GATED:
      return color.special.coinGradient
  }
}

export const DogEar = (props: DogEarProps) => {
  const { type, className, borderOffset = 1 } = props
  const Icon = getIcon(type)
  const { spacing, color } = useTheme()
  const tagColor = getColor(type, color)

  return (
    <Box
      css={{
        position: 'absolute',
        top: -1 * borderOffset,
        left: -1 * borderOffset,
        zIndex: 10,
        overflow: 'hidden'
      }}
      borderTopLeftRadius='m'
      h='3xl'
      w='3xl'
      className={className}
    >
      <Rectangle
        css={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          color: tagColor,
          ...(type === DogEarType.TOKEN_GATED && {
            fill: `url(#coinGradient)`,
            '& path:nth-child(1)': {
              fill: 'inherit'
            }
          })
        }}
      />
      <Icon
        size='s'
        color='white'
        css={{ position: 'absolute', top: spacing.unit1, left: spacing.unit1 }}
      />
    </Box>
  )
}
