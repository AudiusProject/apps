import { ReactNode } from 'react'

import { Flex, FlexProps } from '@audius/harmony'

import { useIsMobile } from 'hooks/useIsMobile'

export type ResponsiveModalContentProps = {
  children: ReactNode
  className?: string
  modalProps?: FlexProps
  drawerProps?: FlexProps
} & FlexProps

export const ResponsiveModalContent = ({
  children,
  className,
  modalProps,
  drawerProps,
  ...flexProps
}: ResponsiveModalContentProps) => {
  const isMobile = useIsMobile()

  const defaultPadding = isMobile ? 'l' : 'xl'
  const defaultTopPadding = 'xl'

  const platformProps = isMobile ? modalProps : drawerProps

  const mergedProps = {
    column: true,
    p: defaultPadding,
    pt: defaultTopPadding,
    ...flexProps,
    ...platformProps
  }

  return (
    <Flex className={className} {...mergedProps}>
      {children}
    </Flex>
  )
}
