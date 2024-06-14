import type { PropsWithChildren } from 'react'

import { Flex, Text } from '@audius/harmony-native'

type MetadataItemProps = PropsWithChildren<{
  label: string
}>

export const MetadataItem = ({ label, children }: MetadataItemProps) => {
  return (
    <Flex direction='row' alignItems='center' key={label} gap='xs'>
      <Text variant='label'>{label}</Text>
      <Text variant='body' size='s' strength='strong'>
        {children}
      </Text>
    </Flex>
  )
}
