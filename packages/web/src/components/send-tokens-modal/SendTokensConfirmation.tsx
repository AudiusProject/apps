import React, { ChangeEvent, useState } from 'react'

import {
  useArtistCoin,
  useTokenBalance,
  transformArtistCoinToTokenInfo
} from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import { FixedDecimal } from '@audius/fixed-decimal'
import {
  Button,
  Text,
  Flex,
  Divider,
  Hint,
  Checkbox,
  useMedia
} from '@audius/harmony'

import { CryptoBalanceSection } from 'components/buy-sell-modal/CryptoBalanceSection'

interface SendTokensConfirmationProps {
  mint: string
  amount: bigint
  destinationAddress: string
  onConfirm: () => void
  onBack: () => void
  onClose: () => void
}

const messages = {
  sendTitle: 'SEND',
  amountToSend: 'Amount to Send',
  destinationAddress: 'Destination Address',
  reviewDetails: 'Review Details Carefully',
  reviewDescription:
    'By proceeding, you accept full responsibility for any errors, including the risk of irreversible loss of funds. Transfers are final and cannot be reversed.',
  confirmationText:
    'I have reviewed the information and understand that transfers are final.',
  back: 'Back',
  confirm: 'Confirm',
  loadingTokenInformation: 'Loading token information...'
}

const SendTokensConfirmation = ({
  mint,
  amount,
  destinationAddress,
  onConfirm,
  onBack,
  onClose
}: SendTokensConfirmationProps) => {
  const [isConfirmed, setIsConfirmed] = useState(false)
  const { isMobile } = useMedia()

  // Get token data and balance using the same hooks as ReceiveTokensModal
  const { data: coin } = useArtistCoin(mint)
  const { data: tokenBalance } = useTokenBalance({
    mint,
    includeExternalWallets: false,
    includeStaked: false
  })
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

  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    setIsConfirmed(event.target.checked)
  }

  // Show loading state if we don't have tokenInfo yet
  if (!tokenInfo) {
    return (
      <Flex direction='column' gap='xl' p='xl' alignItems='center'>
        <Text variant='body' size='l' color='subdued'>
          {messages.loadingTokenInformation}
        </Text>
      </Flex>
    )
  }

  return (
    <Flex column gap='xl' p='xl'>
      {/* Token Balance Section */}
      <CryptoBalanceSection
        tokenInfo={tokenInfo}
        name={tokenInfo.name}
        amount={tokenBalance?.balanceLocaleString ?? ''}
      />

      <Divider orientation='horizontal' />

      {/* Amount Info */}
      <Flex
        direction={isMobile ? 'column' : 'row'}
        justifyContent='space-between'
        gap='m'
      >
        <Text variant='heading' size='s' color='subdued'>
          {messages.amountToSend}
        </Text>
        <Text variant='heading' size='s' css={{ wordBreak: 'break-all' }}>
          {walletMessages.minus}
          {formatAmount(amount)} ${tokenInfo.symbol}
        </Text>
      </Flex>

      <Divider orientation='horizontal' />

      {/* Transfer Info */}
      <Flex column gap='m'>
        <Text variant='heading' size='s' color='subdued'>
          {messages.destinationAddress}
        </Text>
        <Text
          variant='body'
          size='l'
          color='default'
          css={{ wordBreak: 'break-all' }}
        >
          {destinationAddress}
        </Text>
      </Flex>

      {/* Review Details Hint */}
      <Hint noIcon>
        <Flex column gap='s'>
          <Text variant='title' color='default'>
            {messages.reviewDetails}
          </Text>
          <Text variant='body' size='s'>
            {messages.reviewDescription}
          </Text>
          <Flex gap='xl' alignItems='center'>
            <Checkbox checked={isConfirmed} onChange={handleCheckboxChange} />
            <Text
              variant='body'
              size='s'
              css={(theme) => ({ color: theme.color.neutral.n600 })}
            >
              {messages.confirmationText}
            </Text>
          </Flex>
        </Flex>
      </Hint>

      {/* Action Buttons */}
      <Flex gap='s' row>
        <Button variant='secondary' onClick={onBack} fullWidth>
          {messages.back}
        </Button>
        <Button
          variant='primary'
          onClick={onConfirm}
          disabled={!isConfirmed}
          fullWidth
        >
          {messages.confirm}
        </Button>
      </Flex>
    </Flex>
  )
}

export default SendTokensConfirmation
