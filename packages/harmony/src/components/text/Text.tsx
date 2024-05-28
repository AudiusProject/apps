import { ElementType, ForwardedRef, forwardRef, useContext } from 'react'

import { useTheme } from '@emotion/react'
import { Slot } from '@radix-ui/react-slot'

import { typography } from '../../foundations/typography'

import { variantStylesMap, variantTagMap } from './constants'
import { TextContext } from './textContext'
import type { TextProps } from './types'

export const Text = forwardRef(
  <TextComponentType extends ElementType = 'p'>(
    props: TextProps<TextComponentType>,
    ref: ForwardedRef<TextComponentType>
  ) => {
    const {
      children,
      variant: propVariant,
      strength: strengthProp,
      size: sizeProp,
      color: colorProp,
      shadow,
      tag,
      asChild,
      textAlign,
      textTransform,
      ellipses,
      ...other
    } = props

    const theme = useTheme()
    const { variant: contextVariant } = useContext(TextContext)
    const variant = propVariant ?? contextVariant ?? 'body'
    const strength = strengthProp ?? (contextVariant ? undefined : 'default')
    const size = sizeProp ?? (contextVariant ? undefined : 'm')
    const color = colorProp ?? (contextVariant ? undefined : 'default')

    const variantConfig = variant && variantStylesMap[variant]
    const css = {
      fontFamily: `'Avenir Next LT Pro', 'Helvetica Neue', Helvetica,
    Arial, sans-serif`,
      position: 'relative',
      boxSizing: 'border-box',
      ...(color &&
        color === 'heading' && {
          // inline is necessary to prevent text clipping
          display: 'inline',
          color: theme.color.secondary.secondary,
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          backgroundImage: theme.color.text.heading
        }),
      ...(color && color !== 'heading' && { color: theme.color.text[color] }),
      ...(variantConfig && {
        // @ts-ignore
        fontSize: typography.size[variantConfig.fontSize[size]],
        // @ts-ignore
        lineHeight: typography.lineHeight[variantConfig.lineHeight[size]],
        // @ts-ignore
        fontWeight: typography.weight[variantConfig.fontWeight[strength]],
        ...('css' in variantConfig && variantConfig.css)
      }),
      ...(shadow && {
        textShadow: typography.shadow[shadow]
      }),
      textAlign,
      ...(textTransform && { textTransform }),
      ...(ellipses && {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      })
    }

    // @ts-ignore
    const variantTag = variant && variantTagMap[variant]?.[size]

    const Tag: ElementType = asChild ? Slot : tag ?? variantTag ?? 'span'

    const textElement = (
      <Tag ref={ref} css={css} {...other}>
        {children}
      </Tag>
    )

    if (contextVariant && !propVariant) {
      return textElement
    }

    return (
      <TextContext.Provider value={{ variant }}>
        {textElement}
      </TextContext.Provider>
    )
  }
)
