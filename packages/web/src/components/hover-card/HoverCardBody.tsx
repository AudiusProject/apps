import { ReactNode } from 'react'

import { Flex, Skeleton, Text } from '@audius/harmony'

export type HoverCardBodyProps = {
  icon?: ReactNode
  amount: string | null
  currency?: string
}

export const HoverCardBody = ({
  icon,
  amount,
  currency = '$AUDIO'
}: HoverCardBodyProps) => {
  return (
    <Flex w='100%' p='s' column justifyContent='center'>
      <Flex gap='s' alignItems='center'>
        <Flex>{icon}</Flex>
        <Flex column justifyContent='center'>
          <Flex alignItems='center' gap='xs'>
            {amount ? (
              <Text variant='heading' size='m'>
                {amount}
              </Text>
            ) : (
              <Skeleton w='60px' h='20px' />
            )}
            <Text variant='heading' size='m' color='subdued'>
              {currency}
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}
