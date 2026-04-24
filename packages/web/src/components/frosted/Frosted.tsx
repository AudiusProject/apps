import { ReactNode } from 'react'

import type { Interpolation, Theme } from '@emotion/react'
import { Flex, FlexProps } from '@audius/harmony'

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
          backdropFilter: 'blur(10px)',
          zIndex: 10,
          position: 'relative',
          paddingInline: contentPaddingInline,
          background:
            'color-mix(in srgb, var(--harmony-n-25) 60%, transparent)'
        },
        css
      ]}
      {...props}
    >
      {children}
    </Flex>
  )
}
