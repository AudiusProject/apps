import { buySellMessages as messages } from '@audius/common/messages'

import type { FlexProps } from '@audius/harmony-native'
import { Flex, IconJupiterLogo, Text } from '@audius/harmony-native'

export const PoweredByJupiter = (props: FlexProps) => {
  return (
    <Flex
      direction='row'
      alignItems='center'
      justifyContent='center'
      gap='l'
      p='l'
      pv='m'
      ph='xl'
      border='default'
      backgroundColor='surface1'
      {...props}
    >
      <Text variant='label' size='s' color='subdued'>
        {messages.poweredBy}
      </Text>
      <IconJupiterLogo />
    </Flex>
  )
}
