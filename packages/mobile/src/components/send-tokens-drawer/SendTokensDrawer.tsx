import { useState } from 'react'

import { useSendCoins } from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import type { SolanaWalletAddress, User } from '@audius/common/models'
import { ErrorLevel, Feature } from '@audius/common/models'
import { useSendTokensModal } from '@audius/common/store'

import { Divider, Flex } from '@audius/harmony-native'
import Drawer from 'app/components/drawer/Drawer'
import { reportToSentry } from 'app/utils/reportToSentry'

import { DrawerHeader } from '../drawer/DrawerHeader'

import { SendTokensConfirmation } from './components/SendTokensConfirmation'
import { SendTokensFailure } from './components/SendTokensFailure'
import { SendTokensInput } from './components/SendTokensInput'
import { SendTokensProgress } from './components/SendTokensProgress'
import { SendTokensSuccess } from './components/SendTokensSuccess'

type RecipientType = 'user' | 'wallet'

type SendTokensState = {
  step: 'input' | 'confirm' | 'progress' | 'success' | 'failure'
  amount: bigint
  amountString: string
  destinationAddress: string
  selectedUser: User | null
  selectedMint: string
  recipientType: RecipientType
  signature: string
}

export const SendTokensDrawer = () => {
  const { isOpen, onClose, data } = useSendTokensModal()
  const { mint } = data ?? {}

  const [state, setState] = useState<SendTokensState>({
    step: 'input',
    amount: BigInt(0),
    amountString: '',
    destinationAddress: '',
    selectedUser: null,
    selectedMint: mint ?? '',
    recipientType: 'user',
    signature: ''
  })
  const [error, setError] = useState<string>('')

  const sendTokensMutation = useSendCoins({
    mint: state.selectedMint || (mint ?? '')
  })

  const handleInputContinue = (
    amount: bigint,
    destinationAddress: string,
    selectedUser: User | null,
    selectedMint: string,
    recipientType: RecipientType,
    amountString: string
  ) => {
    setState({
      step: 'confirm',
      amount,
      amountString,
      destinationAddress,
      selectedUser,
      selectedMint,
      recipientType,
      signature: ''
    })
  }

  const handleConfirm = async () => {
    setState((prev) => ({ ...prev, step: 'progress' }))
    setError('')

    try {
      const { signature } = await sendTokensMutation.mutateAsync({
        recipientWallet: state.destinationAddress as SolanaWalletAddress,
        amount: state.amount,
        // When sending to a user, pass their Ethereum address to derive user-bank ATA
        recipientEthAddress: state.selectedUser?.erc_wallet
      })

      setState((prev) => ({ ...prev, step: 'success', signature }))
    } catch (error) {
      let errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred'

      // Check for specific Solana token account errors
      const errorString =
        error instanceof Error ? error.toString() : String(error)
      if (
        errorString.includes('Account not associated with this Mint') ||
        errorString.includes('Custom:3') ||
        errorString.includes('0x3') ||
        errorString.includes('custom program error: 0x3')
      ) {
        errorMessage =
          'The recipient wallet does not have a token account for this coin. They may need to receive tokens of this type first, or the transaction needs to create the account automatically.'
      }

      setError(errorMessage)
      reportToSentry({
        level: ErrorLevel.Error,
        error: error as Error,
        additionalInfo: {
          amount: state.amount.toString(),
          destinationAddress: state.destinationAddress,
          mint: state.selectedMint,
          errorString
        },
        feature: Feature.SendTokens
      })
      setState((prev) => ({ ...prev, step: 'failure' }))
    }
  }

  const handleBack = () => {
    setState((prev) => ({ ...prev, step: 'input' }))
  }

  const handleTryAgain = () => {
    setState((prev) => ({ ...prev, step: 'confirm' }))
    setError('')
  }

  const handleClose = () => {
    onClose()
    setState({
      step: 'input',
      amount: BigInt(0),
      amountString: '',
      destinationAddress: '',
      selectedUser: null,
      selectedMint: mint ?? '',
      recipientType: 'user',
      signature: ''
    })
    setError('')
  }

  const renderHeader = () => {
    return (
      <Flex pv='l' ph='xl' gap='m' mb='m'>
        <DrawerHeader onClose={handleClose} title={walletMessages.send} />
        <Divider />
      </Flex>
    )
  }

  return (
    <Drawer isOpen={isOpen} onClose={handleClose} drawerHeader={renderHeader}>
      {state.step === 'input' ? (
        <SendTokensInput
          mint={mint ?? ''}
          onContinue={handleInputContinue}
          initialAmount={state.amountString}
          initialDestinationAddress={state.destinationAddress}
          initialSelectedUser={state.selectedUser}
          initialRecipientType={state.recipientType}
        />
      ) : null}

      {state.step === 'confirm' ? (
        <SendTokensConfirmation
          mint={state.selectedMint}
          amount={state.amount}
          destinationAddress={state.destinationAddress}
          selectedUser={state.selectedUser}
          recipientType={state.recipientType}
          onConfirm={handleConfirm}
          onBack={handleBack}
          onClose={handleClose}
        />
      ) : null}

      {state.step === 'progress' ? <SendTokensProgress /> : null}

      {state.step === 'success' ? (
        <SendTokensSuccess
          mint={state.selectedMint}
          amount={state.amount}
          destinationAddress={state.destinationAddress}
          selectedUser={state.selectedUser}
          signature={state.signature}
          onDone={handleClose}
        />
      ) : null}

      {state.step === 'failure' ? (
        <SendTokensFailure
          mint={state.selectedMint}
          amount={state.amount}
          destinationAddress={state.destinationAddress}
          selectedUser={state.selectedUser}
          error={error}
          onTryAgain={handleTryAgain}
          onClose={handleClose}
        />
      ) : null}
    </Drawer>
  )
}
