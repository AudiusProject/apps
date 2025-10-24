import { useState } from 'react'

import { useSendCoins } from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import type { SolanaWalletAddress } from '@audius/common/models'
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

type SendTokensState = {
  step: 'input' | 'confirm' | 'progress' | 'success' | 'failure'
  amount: bigint
  destinationAddress: string
  signature: string
}

export const SendTokensDrawer = () => {
  const { isOpen, onClose, data } = useSendTokensModal()
  const { mint } = data ?? {}

  const [state, setState] = useState<SendTokensState>({
    step: 'input',
    amount: BigInt(0),
    destinationAddress: '',
    signature: ''
  })
  const [error, setError] = useState<string>('')

  const sendTokensMutation = useSendCoins({ mint: mint ?? '' })

  const handleInputContinue = (amount: bigint, destinationAddress: string) => {
    setState({
      step: 'confirm',
      amount,
      destinationAddress,
      signature: ''
    })
  }

  const handleConfirm = async () => {
    setState((prev) => ({ ...prev, step: 'progress' }))
    setError('')

    try {
      const { signature } = await sendTokensMutation.mutateAsync({
        recipientWallet: state.destinationAddress as SolanaWalletAddress,
        amount: state.amount
      })

      setState((prev) => ({ ...prev, step: 'success', signature }))
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred'
      setError(errorMessage)
      reportToSentry({
        level: ErrorLevel.Error,
        error: error ?? new Error(errorMessage),
        additionalInfo: {
          amount: state.amount.toString(),
          destinationAddress: state.destinationAddress,
          mint
        },
        feature: Feature.SendTokens
      })
      setState((prev) => ({ ...prev, step: 'failure' }))
    }
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
      destinationAddress: '',
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
          initialAmount={state.amount}
          initialDestinationAddress={state.destinationAddress}
        />
      ) : null}

      {state.step === 'confirm' ? (
        <SendTokensConfirmation
          mint={mint ?? ''}
          amount={state.amount}
          destinationAddress={state.destinationAddress}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      ) : null}

      {state.step === 'progress' ? <SendTokensProgress /> : null}

      {state.step === 'success' ? (
        <SendTokensSuccess
          mint={mint ?? ''}
          amount={state.amount}
          destinationAddress={state.destinationAddress}
          signature={state.signature}
          onDone={handleClose}
        />
      ) : null}

      {state.step === 'failure' ? (
        <SendTokensFailure
          mint={mint ?? ''}
          amount={state.amount}
          destinationAddress={state.destinationAddress}
          error={error}
          onTryAgain={handleTryAgain}
          onClose={handleClose}
        />
      ) : null}
    </Drawer>
  )
}
