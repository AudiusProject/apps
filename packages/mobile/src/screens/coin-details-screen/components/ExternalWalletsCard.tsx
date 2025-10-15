import { useCallback, useMemo } from 'react'

import { useUserCoin } from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { shortenSPLAddress } from '@audius/common/utils'
import type { UserCoinAccount } from '@audius/sdk'

import {
  Button,
  Divider,
  Flex,
  IconLogoCircleSOL,
  IconLogoWhiteBackground,
  Paper,
  Text
} from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

const messages = coinDetailsMessages.externalWallets

type WalletRowProps = {
  mint: string
  decimals: number
} & UserCoinAccount

const WalletRow = ({
  owner: address,
  balance,
  isInAppWallet,
  decimals
}: WalletRowProps) => {
  return (
    <Flex row alignItems='center' gap='m' w='100%'>
      <Flex row alignItems='center' gap='s'>
        {isInAppWallet ? (
          <Flex
            border='default'
            borderRadius='circle'
            style={{ overflow: 'hidden', height: 24, width: 24 }}
            justifyContent='center'
            alignItems='center'
          >
            <IconLogoWhiteBackground size='l' />
          </Flex>
        ) : (
          <IconLogoCircleSOL size='l' />
        )}
        <Text strength='strong'>
          {isInAppWallet ? messages.builtIn : shortenSPLAddress(address)}
        </Text>
      </Flex>
      <Flex row flex={1} justifyContent='flex-end'>
        <Text style={{ fontWeight: 700 }}>
          {Math.trunc(balance / Math.pow(10, decimals)).toLocaleString()}
        </Text>
      </Flex>
    </Flex>
  )
}

const HasBalanceContent = ({
  accounts,
  mint,
  decimals
}: {
  accounts: UserCoinAccount[]
  mint: string
  decimals: number
}) => {
  const navigation = useNavigation()
  const handleButtonPress = useCallback(() => {
    navigation.navigate('ExternalWallets')
  }, [navigation])

  return (
    <Flex column w='100%'>
      <Flex pv='l' ph='xl'>
        <Text variant='heading' size='s'>
          {messages.hasBalanceTitle}
        </Text>
      </Flex>
      <Divider />
      <Flex column gap='m' pv='l' ph='xl'>
        {accounts.map((account) => (
          <WalletRow
            key={account.owner}
            {...account}
            mint={mint}
            decimals={decimals}
          />
        ))}
      </Flex>
      <Divider />
      <Flex column pv='l' ph='xl' gap='l'>
        <Button variant='secondary' onPress={handleButtonPress} size='small'>
          {messages.buttonText}
        </Button>
      </Flex>
    </Flex>
  )
}

const NoBalanceContent = () => {
  const navigation = useNavigation()
  const handleButtonPress = useCallback(() => {
    navigation.navigate('ExternalWallets')
  }, [navigation])

  return (
    <Flex column>
      <Flex pv='l' ph='xl'>
        <Text variant='heading' size='s'>
          {messages.noBalanceTitle}
        </Text>
      </Flex>
      <Divider />
      <Flex column pv='l' ph='xl' gap='l'>
        <Text variant='body' size='m'>
          {messages.description}
        </Text>
        <Button variant='secondary' onPress={handleButtonPress} size='small'>
          {messages.buttonText}
        </Button>
      </Flex>
    </Flex>
  )
}

export const ExternalWalletsCard = ({ mint }: { mint: string }) => {
  const { data: userCoins } = useUserCoin({ mint })
  const { accounts: unsortedAccounts = [], decimals } = userCoins ?? {}
  const accounts = useMemo(
    () => [...unsortedAccounts].sort((a, b) => b.balance - a.balance),
    [unsortedAccounts]
  )
  const hasAccounts = accounts.length > 0

  return (
    <Paper
      borderRadius='l'
      shadow='far'
      border='default'
      column
      alignItems='flex-start'
    >
      {hasAccounts ? (
        <HasBalanceContent
          accounts={accounts}
          mint={mint}
          decimals={decimals ?? 8}
        />
      ) : (
        <NoBalanceContent />
      )}
    </Paper>
  )
}
