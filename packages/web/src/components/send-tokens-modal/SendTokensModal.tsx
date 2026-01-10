import { useState } from 'react'

import {
  useArtistCoin,
  transformArtistCoinToTokenInfo,
  useSendCoins
} from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import {
  ErrorLevel,
  Feature,
  SolanaWalletAddress,
  User
} from '@audius/common/models'
import { useSendTokensModal } from '@audius/common/store'
import { FixedDecimal } from '@audius/fixed-decimal'

import ResponsiveModal from 'components/modal/ResponsiveModal'
import { reportToSentry } from 'store/errors/reportToSentry'

import SendTokensConfirmation from './SendTokensConfirmation'
import SendTokensFailure from './SendTokensFailure'
import SendTokensInput from './SendTokensInput'
import SendTokensProgress from './SendTokensProgress'
import SendTokensSuccess from './SendTokensSuccess'

type SendTokensState = {
  step: 'input' | 'confirm' | 'progress' | 'success' | 'failure'
  amount: bigint
  destinationAddress: string
  selectedUser: User | null
  signature: string
}

const SendTokensModal = () => {
  const { isOpen, onClose: closeModal, data } = useSendTokensModal()
  const { mint } = data ?? {}

  const [state, setState] = useState<SendTokensState>({
    step: 'input',
    amount: BigInt(0),
    destinationAddress: '',
    selectedUser: null,
    signature: ''
  })
  const [error, setError] = useState<string>('')

  const { data: coin } = useArtistCoin(mint ?? '')
  const tokenInfo = coin ? transformArtistCoinToTokenInfo(coin) : undefined

  const sendTokensMutation = useSendCoins({ mint: mint ?? '' })

  const handleInputContinue = (
    amount: bigint,
    destinationAddress: string,
    selectedUser: User | null
  ) => {
    setState({
      step: 'confirm',
      amount,
      destinationAddress,
      selectedUser,
      signature: ''
    })
  }

  const handleConfirm = async () => {
    setState((prev) => ({ ...prev, step: 'progress' }))
    setError('') // Clear any previous errors

    try {
      const { signature } = await sendTokensMutation.mutateAsync({
        recipientWallet: state.destinationAddress as SolanaWalletAddress,
        amount: state.amount,
        // When sending to a user, pass their Ethereum address to derive user-bank ATA
        recipientEthAddress: state.selectedUser?.erc_wallet
      })

      setState((prev) => ({
        ...prev,
        step: 'success',
        signature
      }))
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
          mint,
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
    closeModal()
    setState({
      step: 'input',
      amount: BigInt(0),
      destinationAddress: '',
      selectedUser: null,
      signature: ''
    })
    setError('')
  }

  if (!isOpen || !mint) return null

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      title={walletMessages.send}
      size='m'
      dismissOnClickOutside={state.step === 'input'}
      showDismissButton={state.step === 'input'}
    >
      {state.step === 'input' ? (
        <SendTokensInput
          mint={mint}
          onContinue={handleInputContinue}
          initialAmount={
            state.amount > 0
              ? new FixedDecimal(state.amount, tokenInfo?.decimals).toString()
              : ''
          }
          initialDestinationAddress={state.destinationAddress}
        />
      ) : null}

      {state.step === 'confirm' ? (
        <SendTokensConfirmation
          mint={mint}
          amount={state.amount}
          destinationAddress={state.destinationAddress}
          selectedUser={state.selectedUser}
          onConfirm={handleConfirm}
          onBack={handleBack}
          onClose={handleClose}
        />
      ) : null}

      {state.step === 'progress' ? <SendTokensProgress /> : null}

      {state.step === 'success' ? (
        <SendTokensSuccess
          mint={mint}
          amount={state.amount}
          destinationAddress={state.destinationAddress}
          selectedUser={state.selectedUser}
          signature={state.signature}
          onClose={handleClose}
        />
      ) : null}

      {state.step === 'failure' ? (
        <SendTokensFailure
          mint={mint}
          amount={state.amount}
          destinationAddress={state.destinationAddress}
          selectedUser={state.selectedUser}
          error={error}
          onTryAgain={handleTryAgain}
          onClose={handleClose}
        />
      ) : null}
    </ResponsiveModal>
  )
}

export default SendTokensModal
