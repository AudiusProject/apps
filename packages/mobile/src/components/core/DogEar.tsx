import { DogEarType } from '@audius/common/models'
import type { ViewStyle } from 'react-native'
import { View } from 'react-native'

import {
  IconArtistCoin,
  IconCart,
  IconReceive,
  IconSparkles
} from '@audius/harmony-native'
import DogEarRectangle from 'app/assets/images/dogEarRectangle.svg'
import { makeStyles } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { useThemeColors } from 'app/utils/theme'
import { zIndex } from 'app/utils/zIndex'

import { CoinGradientDogEarSvg } from './CoinGradientDogEarSvg'

const useStyles = makeStyles(({ spacing }) => ({
  container: {
    position: 'absolute',
    top: -1,
    left: -1,
    zIndex: zIndex.DOG_EAR,
    width: spacing(12),
    height: spacing(12),
    overflow: 'hidden',
    borderRadius: spacing(2)
  },

  rectangle: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: spacing(12),
    height: spacing(12),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0
    },
    shadowOpacity: 0.25,
    shadowRadius: spacing(2),
    zIndex: zIndex.DOG_EAR
  },

  icon: {
    position: 'absolute',
    width: spacing(4),
    height: spacing(4),
    top: spacing(1),
    left: spacing(1),
    zIndex: zIndex.DOG_EAR
  }
}))

export type DogEarProps = {
  borderOffset?: number
  type: DogEarType
  style?: ViewStyle
}

export const DogEar = (props: DogEarProps) => {
  const { borderOffset, type, style } = props
  const styles = useStyles()
  const { staticWhite, accentBlue, specialLightGreen } = useThemeColors()

  const { icon: Icon, colors } = {
    [DogEarType.SPECIAL_ACCESS]: {
      icon: IconSparkles,
      colors: [accentBlue, accentBlue]
    },
    [DogEarType.TOKEN_GATED]: {
      icon: IconArtistCoin
    },
    [DogEarType.USDC_PURCHASE]: {
      icon: IconCart,
      colors: [specialLightGreen, specialLightGreen]
    },
    [DogEarType.USDC_EXTRAS]: {
      icon: IconReceive,
      colors: [specialLightGreen, specialLightGreen]
    }
  }[type]

  const borderOffsetStyle = borderOffset
    ? { left: -borderOffset, top: -borderOffset }
    : undefined

  return (
    <View style={[styles.container, borderOffsetStyle, style]}>
      {type === DogEarType.TOKEN_GATED ? (
        <CoinGradientDogEarSvg style={styles.rectangle} />
      ) : (
        <DogEarRectangle fill={colors[0]} style={styles.rectangle} />
      )}
      <Icon
        width={spacing(4)}
        height={spacing(4)}
        fill={staticWhite}
        style={styles.icon}
      />
    </View>
  )
}
