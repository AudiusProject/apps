import {
  useArtistCoin,
  transformArtistCoinToTokenInfo
} from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import { makeSolanaTransactionLink } from '@audius/common/utils'
import { FixedDecimal } from '@audius/fixed-decimal'

import {
  Button,
  Flex,
  Text,
  Divider,
  CompletionCheck,
  IconExternalLink
} from '@audius/harmony-native'
import { BalanceSection } from 'app/components/core'
import { ExternalLink } from 'app/harmony-native/components/TextLink/ExternalLink'

type SendTokensSuccessProps = {
  mint: string
  amount: bigint
  destinationAddress: string
  signature: string
  onDone: () => void
}

export const SendTokensSuccess = ({
  mint,
  amount,
  destinationAddress,
  signature,
  onDone
}: SendTokensSuccessProps) => {
  const { data: coin } = useArtistCoin(mint)
  const tokenInfo = coin ? transformArtistCoinToTokenInfo(coin) : undefined
  const formatAmount = (amount: bigint) => {
    return new FixedDecimal(amount, tokenInfo?.decimals).toLocaleString(
      'en-US',
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }
    )
  }

  return (
    <Flex gap='xl' ph='xl' pb='xl'>
      <BalanceSection mint={mint} internalWalletOnly />
      <Divider />
      <Flex gap='m'>
        <Text variant='heading' size='s' color='subdued'>
          {walletMessages.sent}
        </Text>
        <Text variant='heading' size='m'>
          {walletMessages.minus}
          {formatAmount(amount)} ${tokenInfo?.symbol}
        </Text>
      </Flex>
      <Divider />
      <Flex gap='m'>
        <Text variant='heading' size='s' color='subdued'>
          {walletMessages.sendTokensDestinationAddress}
        </Text>
        <Text variant='body' numberOfLines={1} ellipsizeMode='middle'>
          {destinationAddress}
        </Text>
        <ExternalLink url={makeSolanaTransactionLink(signature)}>
          <Flex row gap='xs' alignItems='center'>
            <Text variant='title' size='s' color='subdued'>
              {walletMessages.viewOnExplorer}
            </Text>
            <IconExternalLink color='subdued' size='s' />
          </Flex>
        </ExternalLink>
      </Flex>

      <Flex row pt='s' pb='l' gap='s' alignItems='center'>
        <CompletionCheck value='complete' />
        <Text variant='heading' size='s'>
          {walletMessages.transactionComplete}
        </Text>
      </Flex>

      <Button variant='primary' fullWidth onPress={onDone}>
        {walletMessages.done}
      </Button>
    </Flex>
  )
}
