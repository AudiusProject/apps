import { ReactNode } from 'react'

import { Flex, FlexProps } from '@audius/harmony'
import type { Interpolation, Theme } from '@emotion/react'

export const Frosted = ({
  children,
  contentPaddingInline = 'var(--harmony-unit-15)',
  css,
  ...props
}: {
  children: ReactNode
  contentPaddingInline?: string
  css?: Interpolation<Theme>
} & FlexProps) => {
  return (
    <Flex
      column
      css={[
        {
          backdropFilter: 'var(--frosted-surface-backdrop-filter, blur(10px))',
          WebkitBackdropFilter:
            'var(--frosted-surface-backdrop-filter, blur(10px))',
          zIndex: 10,
          position: 'relative',
          paddingInline: contentPaddingInline,
          background:
            'var(--frosted-surface-background, color-mix(in srgb, var(--frosted-surface-background-color, var(--harmony-n-25)) var(--frosted-surface-opacity, 65%), transparent))'
        },
        css
      ]}
      {...props}
    >
      {children}
    </Flex>
  )
}
