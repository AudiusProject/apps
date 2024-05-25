import { forwardRef, useContext } from 'react'

import type { BaseTextProps } from '@audius/harmony/src/components/text'
import { variantStylesMap } from '@audius/harmony/src/components/text/constants'
import { TextContext } from '@audius/harmony/src/components/text/textContext'
import { css } from '@emotion/native'
import type { TextProps as NativeTextProps, TextStyle } from 'react-native'
import { Platform, Text as TextBase } from 'react-native'

import { useTheme } from '../../foundations/theme'

export type TextProps = NativeTextProps &
  Omit<BaseTextProps, 'textAlign'> & {
    textAlign?: TextStyle['textAlign']
    textTransform?: TextStyle['textTransform']
    // Needed for proper text wrapping
    flexShrink?: number
  }

export const Text = forwardRef<TextBase, TextProps>((props, ref) => {
  const {
    variant: propVariant,
    size: sizeProp,
    strength: strengthProp,
    style: styleProp,
    color: colorProp = 'default',
    textAlign,
    textTransform,
    shadow,
    flexShrink,
    ...other
  } = props
  const theme = useTheme()
  const { variant: contextVariant } = useContext(TextContext)
  const variant = propVariant ?? contextVariant ?? 'body'
  const strength = strengthProp ?? (contextVariant ? undefined : 'default')
  const size = sizeProp ?? (contextVariant ? undefined : 'm')
  // TODO: make heading a proper gradient
  const color =
    colorProp === 'heading'
      ? theme.color.secondary.secondary
      : theme.color.text[colorProp]

  const variantStyles = variant && variantStylesMap[variant]
  const t = theme.typography

  const fontWeight = strength && variantStyles?.fontWeight[strength]

  const textStyles: TextStyle = css({
    ...(variantStyles && {
      fontSize: size && t.size[variantStyles.fontSize[size]],
      lineHeight: size && t.lineHeight[variantStyles.lineHeight[size]],
      fontFamily:
        strength && t.fontByWeight[variantStyles.fontWeight[strength]],
      ...('css' in variantStyles ? variantStyles.css ?? {} : {})
    }),
    ...(color && { color }),
    ...(shadow && t.shadow[shadow]),
    textAlign,
    ...(textTransform && { textTransform }),
    // Fixes demiBold text misalignment on iOS
    ...(fontWeight === 'demiBold' && Platform.OS === 'ios'
      ? { marginTop: 2 }
      : {}),
    flexShrink
  })

  const isHeading = variant === 'display' || variant === 'heading'

  const textElement = (
    <TextBase
      ref={ref}
      style={[textStyles, styleProp]}
      role={isHeading ? 'heading' : undefined}
      {...other}
    />
  )

  if (contextVariant && !propVariant) {
    return textElement
  }

  return (
    <TextContext.Provider value={{ variant }}>
      {textElement}
    </TextContext.Provider>
  )
})

export { variantStylesMap }
export type { TextSize } from '@audius/harmony/src/components/text/types'
