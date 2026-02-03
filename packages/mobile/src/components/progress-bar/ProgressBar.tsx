import type { ViewStyle } from 'react-native'
import { View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

import { useTheme } from '@audius/harmony-native'
import type { StylesProp } from 'app/styles'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

const useStyles = makeStyles(({ spacing, palette }) => ({
  root: {
    backgroundColor: palette.neutralLight9,
    borderRadius: 22,
    height: spacing(4),
    overflow: 'hidden'
  },
  progressBar: {
    backgroundColor: 'black',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0
  },
  shadow: {
    position: 'absolute',
    backgroundColor: 'white',
    alignSelf: 'center',
    shadowColor: 'black',
    shadowRadius: 4,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 0 },
    elevation: -1
  },
  shadowTop: {
    top: -10,
    height: 10,
    width: '100%'
  },
  shadowBottom: {
    bottom: -10,
    height: 10,
    width: '100%'
  },
  shadowLeft: {
    left: -10,
    height: '100%',
    width: 10
  },
  shadowRight: {
    right: -10,
    height: '100%',
    width: 10
  }
}))

type ProgressBarProps = {
  progress: number
  max: number
  variant?: 'default' | 'coin'
  style?: StylesProp<{
    root: ViewStyle
  }>
}

export const ProgressBar = ({
  progress,
  max,
  variant = 'default',
  style
}: ProgressBarProps) => {
  const styles = useStyles()
  const { pageHeaderGradientColor1, pageHeaderGradientColor2 } =
    useThemeColors()
  const { color, spacing } = useTheme()

  const progressWidth =
    progress > max
      ? '100%'
      : `${Math.round((progress * 100 * 100.0) / max) / 100.0}%`

  const gradientProps =
    variant === 'coin'
      ? {
          ...color.special.coinGradient,
          start: { x: 0, y: 0.5 },
          end: { x: 1, y: 0.5 }
        }
      : {
          colors: [pageHeaderGradientColor1, pageHeaderGradientColor2],
          useAngle: true,
          angle: 315
        }

  return (
    <View style={[styles.root, style?.root]}>
      <LinearGradient
        {...gradientProps}
        style={[
          styles.progressBar,
          {
            width: progressWidth as any,
            ...(variant === 'coin' && { borderRadius: spacing['3xl'] })
          }
        ]}
      />
      <View style={[styles.shadow, styles.shadowTop]} />
      <View style={[styles.shadow, styles.shadowBottom]} />
      <View style={[styles.shadow, styles.shadowLeft]} />
      <View style={[styles.shadow, styles.shadowRight]} />
    </View>
  )
}
