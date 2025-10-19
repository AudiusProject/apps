import type { ReactNode } from 'react'

import { Flex, Text } from '@audius/harmony-native'

type ProfileInputCardProps = {
  title: string
  children: ReactNode
}

export const ProfileInputCard = ({
  title,
  children
}: ProfileInputCardProps) => {
  return (
    <Flex
      direction='column'
      gap='l'
      backgroundColor='white'
      borderRadius='m'
      border='default'
      p='l'
      w='100%'
    >
      <Text variant='title' size='l' color='default'>
        {title}
      </Text>
      {children}
    </Flex>
  )
}
