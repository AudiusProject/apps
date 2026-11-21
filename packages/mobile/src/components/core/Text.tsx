import { useMemo } from 'react'

import type {
  ColorValue,
  TextProps as RNTextProps,
  TextStyle
} from 'react-native'
import { Platform, Text as RNText } from 'react-native'

import { Flex } from '@audius/harmony-native'
import type { FontSize, FontWeight, TextVariant } from 'app/styles'
import { makeStyles, typography } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import type { ThemeColors } from 'app/utils/theme'
import { useThemePalette } from 'app/utils/theme'

export type TextProps = RNTextProps & {
  variant?: TextVariant
  noGutter?: boolean
  color?: 'inherit' | 'error' | 'warning' | keyof ThemeColors
  colorValue?: ColorValue
  weight?: FontWeight
  fontSize?: FontSize | 'inherit'
  textTransform?: TextStyle['textTransform']
  allowNewline?: boolean
  bulleted?: boolean
}

const useStyles = makeStyles(({ typography, palette }) => ({
  root: {
    color: palette.neutral,
    fontSize: typography.fontSize.medium,
    fontFamily: typography.fontByWeight.medium
  }
}))

export const Text = (props: TextProps) => {
  const {
    variant: variantProp,
    noGutter,
    style,
    color = 'neutral',
    colorValue,
    weight,
    fontSize: fontSizeProp,
    textTransform,
    children: childrenProp,
    allowNewline,
    bulleted,
    ...other
  } = props
  const variant = variantProp ?? 'body'
  const fontSize = !fontSizeProp && !variantProp ? 'medium' : fontSizeProp

  const styles = useStyles()
  const palette = useThemePalette()

  const customStyles = useMemo(
    () => [
      typography[variant],
      color !== 'inherit' && {
        color:
          color === 'error'
            ? palette.accentRed
            : color === 'warning'
              ? palette.accentOrange
              : (colorValue ?? palette[color])
      },
      weight && {
        fontFamily: typography.fontByWeight[weight],
        marginTop:
          weight === 'demiBold' && Platform.OS === 'ios'
            ? spacing(
                fontSize && ['xl', 'large'].includes(fontSize)
                  ? 1
                  : fontSize === 'small'
                    ? 0.5
                    : 0
              )
            : undefined
      },
      fontSize &&
        fontSize !== 'inherit' && { fontSize: typography.fontSize[fontSize] },
      noGutter && { marginBottom: 0 },
      { textTransform }
    ],
    [
      variant,
      color,
      palette,
      colorValue,
      weight,
      fontSize,
      noGutter,
      textTransform
    ]
  )

  const children =
    typeof childrenProp === 'string' && !allowNewline
      ? childrenProp.replace('\n', ' ')
      : childrenProp

  if (bulleted) {
    return (
      <Flex direction='row' alignItems='flex-start' gap='s' flex={1}>
        {/* unicode character for a bullet */}
        <RNText style={[styles.root, customStyles]}>{'\u2022'}</RNText>
        <RNText style={[styles.root, customStyles, style]} {...other}>
          {children}
        </RNText>
      </Flex>
    )
  }

  return (
    <RNText style={[styles.root, customStyles, style]} {...other}>
      {children}
    </RNText>
  )
}
