import { forwardRef } from 'react'

import { variantStylesMap } from '@audius/harmony/src/components/text'
import type { BaseTextProps } from '@audius/harmony/src/components/text'
import { css } from '@emotion/native'
import type { TextProps as NativeTextProps, TextStyle } from 'react-native'
import { Platform, Text as TextBase } from 'react-native'

import { useTheme } from '../../foundations/theme'

export type TextProps = NativeTextProps &
  Omit<BaseTextProps, 'textAlign'> & {
    textAlign?: TextStyle['textAlign']
    textTransform?: TextStyle['textTransform']
    // Needed for proper text wrapping
    shrink?: boolean
  }

export const Text = forwardRef<TextBase, TextProps>((props, ref) => {
  const {
    variant,
    size = 'm',
    strength = 'default',
    style: styleProp,
    color: colorProp = 'default',
    textAlign,
    textTransform,
    shadow,
    shrink,
    ...other
  } = props
  const theme = useTheme()
  // TODO: make heading a proper gradient
  const color =
    colorProp === 'heading'
      ? theme.color.secondary.secondary
      : theme.color.text[colorProp]

  const variantStyles = variant && variantStylesMap[variant]
  const t = theme.typography

  const fontWeight = variantStyles?.fontWeight[strength]

  const textStyles: TextStyle = css({
    ...(variantStyles && {
      fontSize: t.size[variantStyles.fontSize[size]],
      lineHeight: t.lineHeight[variantStyles.lineHeight[size]],
      fontFamily: t.fontByWeight[variantStyles.fontWeight[strength]],
      ...('css' in variantStyles ? variantStyles.css : {})
    }),
    ...(color && { color }),
    ...(shadow && t.shadow[shadow]),
    textAlign,
    ...(textTransform && { textTransform }),
    // Fixes demiBold text misalignment on iOS
    ...(fontWeight === 'demiBold' && Platform.OS === 'ios'
      ? { marginTop: 2 }
      : {}),
    ...(shrink ? { flexShrink: 1 } : {})
  })

  const isHeading = variant === 'display' || variant === 'heading'

  return (
    <TextBase
      ref={ref}
      style={[textStyles, styleProp]}
      role={isHeading ? 'heading' : undefined}
      {...other}
    />
  )
})

export { variantStylesMap }
export type { TextSize } from '@audius/harmony/src/components/text/Text/types'
