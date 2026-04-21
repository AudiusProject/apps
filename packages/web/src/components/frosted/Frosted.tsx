import { ReactNode } from 'react'

import { Flex, FlexProps } from '@audius/harmony'

export const Frosted = ({
  children,
  contentPaddingInline = 'var(--harmony-unit-15)',
  ...props
}: { children: ReactNode; contentPaddingInline?: string } & FlexProps) => {
  return (
    <Flex
      column
      css={{
        backdropFilter: 'blur(10px)',
        zIndex: 10,
        position: 'relative',
        paddingInline: contentPaddingInline,
        background: 'color-mix(in srgb, var(--harmony-n-25) 60%, transparent)'
      }}
      {...props}
    >
      {children}
    </Flex>
  )
}
