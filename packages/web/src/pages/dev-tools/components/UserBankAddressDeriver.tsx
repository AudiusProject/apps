import { useState } from 'react'

import { useFanClubs } from '@audius/common/api'
import {
  Button,
  Flex,
  IconKey,
  Paper,
  Text,
  TextInput,
  Select
} from '@audius/harmony'
import { ClaimableTokensProgram } from '@audius/spl'
import { PublicKey } from '@solana/web3.js'

import { useDevToolCardStyles } from '../DevTools'
import { messages } from '../messages'

export const UserBankAddressDeriver = () => {
  const [ethAddress, setEthAddress] = useState('')
  const [selectedToken, setSelectedToken] = useState('')
  const [derivedAddress, setDerivedAddress] = useState('')
  const [error, setError] = useState('')
  const styles = useDevToolCardStyles()

  const {
    data: coins,
    isPending: isLoadingCoins,
    error: coinsError
  } = useFanClubs()

  // Set default token when coins are loaded
  const availableCoins = coins?.filter((coin) => coin.ticker) ?? []
  const defaultToken =
    availableCoins.find((coin) => coin.ticker === '$AUDIO')?.mint ??
    availableCoins[0]?.mint ??
    ''

  // Set default token if not already set
  if (selectedToken === '' && defaultToken !== '') {
    setSelectedToken(defaultToken)
  }

  const handleDeriveAddress = async () => {
    setDerivedAddress('')
    setError('')

    if (!ethAddress.trim()) {
      setError('Ethereum address cannot be empty.')
      return
    }
    if (!ethAddress.startsWith('0x') || ethAddress.length !== 42) {
      setError('Invalid Ethereum address format.')
      return
    }

    try {
      const selectedCoin = coins?.find((coin) => coin.mint === selectedToken)
      if (!selectedCoin) {
        setError(`Token information not found for selected token`)
        return
      }

      const mintPk = new PublicKey(selectedCoin.mint)
      const programIdPk = ClaimableTokensProgram.programId

      const authorityPDA = await ClaimableTokensProgram.deriveAuthority({
        programId: programIdPk,
        mint: mintPk
      })

      const userBankAddress = await ClaimableTokensProgram.deriveUserBank({
        ethAddress,
        claimableTokensPDA: authorityPDA
      })

      setDerivedAddress(userBankAddress.toBase58())
    } catch (e: any) {
      console.error('Error deriving user bank address:', e)
      setError(e.message || 'An unknown error occurred.')
    }
  }

  return (
    <Paper
      direction='column'
      alignItems='flex-start'
      gap='l'
      p='l'
      css={styles.root}
    >
      <Flex alignItems='center' gap='m'>
        <IconKey size='l' color='default' />
        <Text variant='title' size='l'>
          {messages.userBankDeriverTitle}
        </Text>
      </Flex>
      <Text variant='body'>{messages.userBankDeriverDescription}</Text>

      <Text variant='label' size='s'>
        {messages.userBankDeriverEthAddressLabel}
      </Text>
      <TextInput
        label={messages.userBankDeriverEthAddressLabel}
        hideLabel
        placeholder={messages.userBankDeriverEthAddressPlaceholder}
        value={ethAddress}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setEthAddress(e.target.value)
        }
        width='100%'
      />

      <Text variant='label' size='s'>
        {messages.userBankDeriverTokenLabel}
      </Text>
      <Select
        label={messages.userBankDeriverTokenLabel}
        hideLabel
        value={selectedToken}
        onChange={(value: string) => setSelectedToken(value)}
        aria-label={messages.userBankDeriverTokenLabel}
        options={availableCoins.map((coin) => ({
          value: coin.mint,
          label: coin.ticker || coin.mint
        }))}
        width='100%'
        disabled={isLoadingCoins}
      />

      <Button
        variant='secondary'
        fullWidth
        onClick={handleDeriveAddress}
        disabled={
          isLoadingCoins || availableCoins.length === 0 || !selectedToken
        }
      >
        {isLoadingCoins ? 'Loading tokens...' : messages.userBankDeriverButton}
      </Button>

      {derivedAddress && (
        <Flex direction='column' gap='s' css={{ width: '100%' }}>
          <Text variant='label' size='s'>
            {messages.userBankDeriverOutputLabel}
          </Text>
          <Paper as='pre' p='s' w='100%' backgroundColor='default'>
            <Text variant='body' size='s'>
              {derivedAddress}
            </Text>
          </Paper>
        </Flex>
      )}

      {(error || coinsError) && (
        <Flex direction='column' gap='s' css={{ width: '100%' }}>
          <Text variant='label' size='s' color='danger'>
            {messages.userBankDeriverErrorLabel}
          </Text>
          <Text variant='body' color='danger'>
            {error || (coinsError ? 'Failed to load available tokens' : '')}
          </Text>
        </Flex>
      )}
    </Paper>
  )
}
