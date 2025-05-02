import { useTheme, CSSObject } from '@emotion/react'

import { Flex } from '../layout/Flex'
import { Skeleton } from '../skeleton/Skeleton'
import { Text } from '../text/Text'

import type { BalancePillProps } from './types'

/**
 * A pill-shaped component that displays a balance, typically used to show a user's token balance.
 */
export const BalancePill = ({
  balance,
  children,
  ...props
}: BalancePillProps) => {
  const { color } = useTheme()

  const textStyles: CSSObject = {
    color: color.neutral.n950
  }

  const isLoading = balance === null

  return (
    <Flex
      pl='s'
      alignItems='center'
      gap='xs'
      borderRadius='circle'
      border='default'
      backgroundColor='surface1'
      {...props}
    >
      {isLoading ? (
        <Skeleton w='m' h='s' />
      ) : (
        <Text variant='label' size='s' textAlign='center' css={textStyles}>
          {balance}
        </Text>
      )}
      <Flex h='unit6' p='unitHalf' justifyContent='center' alignItems='center'>
        {children}
      </Flex>
    </Flex>
  )
}
