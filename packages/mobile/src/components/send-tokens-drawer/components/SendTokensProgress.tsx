import { walletMessages } from '@audius/common/messages'

import { Flex, Text, LoadingSpinner } from '@audius/harmony-native'

const HEIGHT = 500

export const SendTokensProgress = () => {
  return (
    <Flex
      gap='xl'
      p='xl'
      alignItems='center'
      justifyContent='center'
      h={HEIGHT}
    >
      <Flex alignItems='center' gap='xl'>
        <LoadingSpinner style={{ width: 32, height: 32 }} />
        <Flex alignItems='center' gap='s'>
          <Text variant='heading' size='l'>
            {walletMessages.sendTokensTransactionInProgress}
          </Text>
          <Text variant='body'>{walletMessages.thisMayTakeAMoment}</Text>
        </Flex>
      </Flex>
    </Flex>
  )
}
