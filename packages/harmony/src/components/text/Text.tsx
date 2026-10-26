import {
  cloneElement,
  ElementType,
  ForwardedRef,
  forwardRef,
  isValidElement,
  useContext
} from 'react'

import { Theme, useTheme } from '@emotion/react'
import { Slot } from '@radix-ui/react-slot'

import { bodyLineHeightMap, variantStylesMap, variantTagMap } from './constants'
import { TextContext } from './textContext'
import type { TextProps } from './types'

const getColorCss = (color: TextProps['color'], theme: Theme) => {
  if (!color) return {}
  if (color === 'heading') {
    return {
      color: theme.color.secondary.secondary,
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      backgroundImage: theme.color.text.heading
    }
  }
  if (color === 'inherit') {
    return { color: 'inherit' }
  }
  return { color: theme.color.text[color] }
}

// Check if text contains Unicode subscript characters
const containsSubscripts = (children: any): boolean => {
  if (!children) return false
  const text = typeof children === 'string' ? children : String(children)
  // Unicode subscript range: \u2080-\u2089 (₀-₉) and other subscript chars
  return /[\u2080-\u209F]/.test(text)
}

// Process children to replace Unicode subscripts with <sub> tags
const processSubscripts = (children: any): any => {
  if (!children) return children
  if (typeof children === 'string') {
    // Replace Unicode subscript characters with <sub> tags
    const parts = children.split(/([\u2080-\u209F]+)/)
    if (parts.length === 1) return children // No subscripts found

    return parts.map((part, index) => {
      if (/[\u2080-\u209F]/.test(part)) {
        return <sub key={index}>{part}</sub>
      }
      return part
    })
  }
  if (Array.isArray(children)) {
    return children.map(processSubscripts)
  }
  if (isValidElement(children)) {
    return cloneElement(
      children,
      {},
      processSubscripts((children.props as any).children)
    )
  }
  return children
}

export const Text = forwardRef(
  <TextComponentType extends ElementType = 'p'>(
    props: TextProps<TextComponentType>,
    ref: ForwardedRef<TextComponentType>
  ) => {
    const {
      children,
      variant: variantProp,
      strength: strengthProp,
      size: sizeProp,
      color,
      shadow,
      tag,
      asChild,
      textAlign,
      textTransform,
      ellipses,
      maxLines,
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

    const variantConfig = variant && variantStylesMap[variant]
    const hasSubscripts = containsSubscripts(children)

    const css = {
      fontFamily: theme.typography.font,
      position: 'relative',
      boxSizing: 'border-box',
      ...getColorCss(color, theme),
      ...(variantConfig && {
        // @ts-ignore
        fontSize: theme.typography.size[variantConfig.fontSize[size]],

        lineHeight:
          // @ts-ignore
          theme.typography.lineHeight[
            lineHeight && variant === 'body' && size
              ? // @ts-ignore
                bodyLineHeightMap[size][lineHeight]
              : // @ts-ignore
                variantConfig.lineHeight[size]
          ],
        // @ts-ignore
        fontWeight: theme.typography.weight[variantConfig.fontWeight[strength]],
        ...('css' in variantConfig && variantConfig.css),
        ...(lineHeight === 'multi' && {
          wordBreak: 'break-word',
          hyphens: 'auto'
        })
      }),
      ...(shadow && {
        textShadow: theme.typography.shadow[shadow]
      }),
      textAlign,
      ...(textTransform && { textTransform }),
      ...(ellipses && {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }),
      ...(maxLines && {
        overflow: 'hidden',
        display: '-webkit-box',
        lineClamp: `${maxLines}`,
        WebkitLineClamp: `${maxLines}`,
        WebkitBoxOrient: 'vertical'
      }),
      ...(userSelect && { userSelect: `${userSelect} !important` }),
      unicodeBidi: 'isolate'
    }

    // @ts-ignore
    const variantTag = variant && variantTagMap[variant]?.[size]

    const Tag: ElementType = asChild ? Slot : (tag ?? variantTag ?? 'span')

    // Only convert Unicode subscripts to <sub> tags for body variants with default strength.
    // Other variants/strengths render Unicode subscripts correctly without this conversion.
    const shouldProcessSubscripts =
      hasSubscripts &&
      variant === 'body' &&
      (!strength || strength === 'default')

    const processedChildren = shouldProcessSubscripts
      ? processSubscripts(children)
      : children

    const textElement = (
      <Tag ref={ref} css={css} {...other}>
        {processedChildren}
      </Tag>
    )

    if (parentVariant) {
      return textElement
    }

    return (
      <TextContext.Provider value={{ variant }}>
        {textElement}
      </TextContext.Provider>
    )
  }
)
