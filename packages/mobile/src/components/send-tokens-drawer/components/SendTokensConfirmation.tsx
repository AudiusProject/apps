import { useState } from 'react'

import {
  useArtistCoin,
  transformArtistCoinToTokenInfo
} from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import { FixedDecimal } from '@audius/fixed-decimal'
import { css } from '@emotion/native'

import { Button, Flex, Text, Divider } from '@audius/harmony-native'
import { BalanceSection, Switch } from 'app/components/core'

type SendTokensConfirmationProps = {
  mint: string
  amount: bigint
  destinationAddress: string
  onConfirm: () => void
  onClose: () => void
}

export const SendTokensConfirmation = ({
  mint,
  amount,
  destinationAddress,
  onConfirm
}: SendTokensConfirmationProps) => {
  const [isConfirmed, setIsConfirmed] = useState(false)

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
      <BalanceSection mint={mint} />
      <Divider />

      <Flex gap='l' flex={1}>
        <Text variant='heading' size='s' color='subdued'>
          {walletMessages.sendTokensAmountToSend}
        </Text>
        <Text variant='heading' size='m'>
          {walletMessages.minus}
          {formatAmount(amount)} ${tokenInfo?.symbol}
        </Text>

        <Divider />

        <Text variant='heading' size='s' color='subdued'>
          {walletMessages.sendTokensDestinationAddress}
        </Text>
        <Text variant='body' numberOfLines={1} ellipsizeMode='middle'>
          {destinationAddress}
        </Text>
      </Flex>

      <Flex
        backgroundColor='surface1'
        borderRadius='m'
        p='l'
        border='default'
        gap='s'
      >
        <Text variant='title'>{walletMessages.reviewDetails}</Text>
        <Text variant='body' size='s'>
          {walletMessages.sendTokensDisclaimer}
        </Text>
        <Flex row gap='xl' justifyContent='flex-start' alignItems='center'>
          <Switch
            value={isConfirmed}
            onValueChange={(value) => {
              setIsConfirmed(value)
            }}
          />
          <Text
            variant='body'
            size='s'
            color='subdued'
            style={css({ flex: 1 })}
          >
            {walletMessages.iHaveReviewed}
          </Text>
        </Flex>
      </Flex>

      <Button
        variant='primary'
        onPress={onConfirm}
        disabled={!isConfirmed}
        fullWidth
      >
        {walletMessages.confirm}
      </Button>
    </Flex>
  )
}
