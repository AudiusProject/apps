import { buySellMessages as messages } from '@audius/common/messages'

import { Flex, IconJupiterLogo, Text } from '@audius/harmony-native'

export const PoweredByJupiter = () => {
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
    >
      <Text variant='label' size='s' color='subdued'>
        {messages.poweredBy}
      </Text>
      <IconJupiterLogo />
    </Flex>
  )
}
