import { forwardRef } from 'react'

import { Flex } from '../layout/Flex'

import { ModalFooterProps } from './types'

/**
 * Footer component to be used inside modals
 */
export const ModalFooter = forwardRef<HTMLDivElement, ModalFooterProps>(
  function ModalFooter({ children, ...props }, ref) {
    return (
      <Flex
        ref={ref}
        justifyContent='center'
        alignItems='center'
        p='xl'
        gap='s'
        flex='0 0 auto'
        {...props}
      >
        {children}
      </Flex>
    )
  }
)
