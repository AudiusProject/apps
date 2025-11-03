import { useCallback } from 'react'

import { useFormattedUSDCBalance } from '@audius/common/hooks'
import { buySellMessages } from '@audius/common/messages'
import { TOKEN_LISTING_MAP } from '@audius/common/store'
import { TouchableOpacity } from 'react-native'

import { Flex, IconTokenUSDC, spacing, Text } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

export const CashCard = () => {
  const navigation = useNavigation()
  const { balanceFormatted, isLoading } = useFormattedUSDCBalance()

  const onPress = useCallback(() => {
    navigation.navigate('CashScreen')
  }, [navigation])

  return (
    <TouchableOpacity onPress={onPress} disabled={isLoading}>
      <Flex
        p='l'
        pl='xl'
        row
        h={96}
        justifyContent='space-between'
        alignItems='center'
      >
        <Flex row alignItems='center' gap='l' style={{ flexShrink: 1 }}>
          <IconTokenUSDC size='4xl' />
          <Flex column gap='xs'>
            <Text variant='heading' size='s' numberOfLines={1}>
              {buySellMessages.cash}
            </Text>
            <Flex row alignItems='center' gap='xs'>
              <Text variant='title' size='l' color='subdued'>
                {TOKEN_LISTING_MAP.USDC.symbol}
              </Text>
            </Flex>
          </Flex>
        </Flex>
        <Flex row alignItems='center' gap='m' ml={spacing.unit22}>
          {!isLoading ? (
            <Text variant='title' size='l' color='default'>
              {balanceFormatted}
            </Text>
          ) : null}
        </Flex>
      </Flex>
    </TouchableOpacity>
  )
}
