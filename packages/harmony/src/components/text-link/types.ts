import type { HTMLProps } from 'react'

import type { TextProps } from 'components/text/Text'

type TextLinkTextProps = Omit<TextProps, 'variant' | 'color'>

export type TextLinkProps = TextLinkTextProps &
  Omit<
    HTMLProps<HTMLAnchorElement>,
    // Props from Text that don't match anchor props
    'size' | 'color' | 'ref'
  > & {
    /**
     * Change the default rendered element for the one passed as a child,
     *  merging their props and behavior.
     */
    asChild?: boolean

    /**
     * Which variant to display.
     * @default default
     */
    variant?: 'default' | 'visible' | 'inverted'

    /**
     * Which text variant to display.
     */
    textVariant?: TextProps['variant']

    /**
     * If true, prevent the click event from being propagated to other elements.
     * @default true
     */
    stopPropagation?: boolean

    /**
     * Mark as true if the link destination is outside of the app. Causes the
     * link to open in a new tab.
     * @default false
     */
    isExternal?: boolean

    // Internal props

    /**
     * @ignore: This prop is for internal use only
     */
    _isHovered?: boolean
  }
