import type { HTMLProps } from 'react'

import type { TextProps } from '../text'

export type TextLinkProps = Omit<TextProps, 'variant' | 'onClick' | 'color'> &
  Omit<HTMLProps<HTMLAnchorElement>, 'size' | 'color' | 'ref'> & {
    /**
     * Change the default rendered element for the one passed as a child,
     *  merging their props and behavior.
     */
    asChild?: boolean

    /**
     * Which variant to display. 'active' is temporary until this pattern is removed
     */
    variant?:
      | 'default'
      | 'subdued'
      | 'visible'
      | 'inverted'
      | 'secondary'
      | 'active'

    /**
     * Which text variant to display.
     */
    textVariant?: TextProps['variant']

    /**
     * When true, always show the link underline. This can help emphasize that
     * a text-link is present when next to other text.
     */
    showUnderline?: boolean

    /**
     * When true, hide the underline when the link is active.
     */
    noUnderlineOnHover?: boolean

    /**
     * When `true`, render link in active style (e.g. hover color)
     */
    isActive?: boolean

    /**
     * Mark as true if the link destination is outside of the app. Causes the
     * link to open in a new tab.
     * @default false
     */
    isExternal?: boolean

    /**
     * Whether or not to apply text ellipsis styling.
     * This will make the link block displayed which may affect how it flows in certain flex containers
     */
    ellipses?: boolean

    /**
     * Whether or not to apply styling to inner svgs.
     * Some text links may include an icon that you wish to style similarly to the text
     * (e.g. hover change colors/animations)
     */
    applyHoverStylesToInnerSvg?: boolean
  }
