import { ReactNode } from 'react'

import { Flex, Text } from '@audius/harmony'

export const ProgressDescription = ({
  description
}: {
  description: ReactNode
}) => {
  return (
    <Flex column gap='m' pv='s'>
      <Text variant='body'>{description}</Text>
    </Flex>
  )
}
