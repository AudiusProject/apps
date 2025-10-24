import { forwardRef, useContext } from 'react'

import type { BaseTextProps } from '@audius/harmony/src/components/text'
import {
  variantStylesMap,
  bodyLineHeightMap
} from '@audius/harmony/src/components/text/constants'
import { TextContext } from '@audius/harmony/src/components/text/textContext'
import { css } from '@emotion/native'
import type { TextProps as NativeTextProps, TextStyle } from 'react-native'
import { Platform, Text as TextBase } from 'react-native'

import { useTheme } from '../../foundations/theme'

export type TextProps = NativeTextProps &
  Omit<BaseTextProps, 'textAlign' | 'ellipsis'> & {
    textAlign?: TextStyle['textAlign']
    textTransform?: TextStyle['textTransform']
    // Needed for proper text wrapping
    flexShrink?: number
    userSelect?: 'none' | 'text' | 'all' | 'contain'
  }

export const Text = forwardRef<TextBase, TextProps>((props, ref) => {
  const {
    variant: variantProp,
    size: sizeProp,
    strength: strengthProp,
    style: styleProp,
    color: colorProp = 'default',
    textAlign,
    textTransform,
    shadow,
    flexShrink,
    lineHeight,
    userSelect,
    ...other
  } = props
  const theme = useTheme()
  const { variant: contextVariant } = useContext(TextContext)
  const variant = variantProp ?? contextVariant ?? 'body'
  const parentVariant = contextVariant && !variantProp
  const strength = strengthProp ?? (parentVariant ? undefined : 'default')
  const size = sizeProp ?? (parentVariant ? undefined : 'm')
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
      lineHeight:
        size &&
        t.lineHeight[
          lineHeight && variant === 'body'
            ? bodyLineHeightMap[size][lineHeight]
            : variantStyles.lineHeight[size]
        ],
      fontFamily:
        strength && t.fontByWeight[variantStyles.fontWeight[strength]],
      ...('css' in variantStyles ? (variantStyles.css ?? {}) : {})
    }),
    ...(color && { color }),
    ...(shadow && t.shadow[shadow]),
    textAlign,
    ...(textTransform && { textTransform }),
    // Fixes demiBold text misalignment on iOS
    ...(fontWeight === 'demiBold' && Platform.OS === 'ios'
      ? { marginTop: 2 }
      : {}),
    flexShrink,
    ...(userSelect && { userSelect })
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

  if (parentVariant) {
    return textElement
  }

  return (
    <TextContext.Provider value={{ variant }}>
      {textElement}
    </TextContext.Provider>
  )
})

export { variantStylesMap, bodyLineHeightMap }
export type { TextSize } from '@audius/harmony/src/components/text/types'
