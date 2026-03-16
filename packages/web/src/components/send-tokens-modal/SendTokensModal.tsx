import { useState, useEffect, useRef } from 'react'

import { useSendCoins } from '@audius/common/api'
import { walletMessages } from '@audius/common/messages'
import {
  ErrorLevel,
  Feature,
  SolanaWalletAddress,
  User
} from '@audius/common/models'
import { useSendTokensModal } from '@audius/common/store'

import ResponsiveModal from 'components/modal/ResponsiveModal'
import { reportToSentry } from 'store/errors/reportToSentry'

import SendTokensConfirmation from './SendTokensConfirmation'
import SendTokensFailure from './SendTokensFailure'
import SendTokensInput from './SendTokensInput'
import SendTokensProgress from './SendTokensProgress'
import SendTokensSuccess from './SendTokensSuccess'

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

const SendTokensModal = () => {
  const { isOpen, onClose: closeModal, data } = useSendTokensModal()
  const { mint, user: prePopulatedUser } = data ?? {}
  const isAppKitModalOpenRef = useRef(false)

  // Monitor for AppKit modal opening/closing
  useEffect(() => {
    if (!isOpen) return

    const checkIfAppKitOpen = () => {
      const backdrop = document.querySelector('[data-reown-backdrop]')
      if (!backdrop) return false
      const style = window.getComputedStyle(backdrop)
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        parseFloat(style.opacity) > 0
      )
    }

    // Use MutationObserver to detect when AppKit modal appears/disappears
    const observer = new MutationObserver(() => {
      isAppKitModalOpenRef.current = checkIfAppKitOpen()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    })

    // Check initial state
    isAppKitModalOpenRef.current = checkIfAppKitOpen()

    // Listen for clicks on connect links to prevent immediate close
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const connectLink = target.closest('a[href="#"]')
      if (connectLink && connectLink.textContent?.includes('Connect')) {
        // Prevent closing for 1 second to allow AppKit modal to open
        isAppKitModalOpenRef.current = true
        setTimeout(() => {
          isAppKitModalOpenRef.current = checkIfAppKitOpen()
        }, 1000)
      }
    }

    document.addEventListener('click', handleClick, true)

    return () => {
      observer.disconnect()
      document.removeEventListener('click', handleClick, true)
      isAppKitModalOpenRef.current = false
    }
  }, [isOpen])

  const [state, setState] = useState<SendTokensState>({
    step: 'input',
    amount: BigInt(0),
    amountString: '',
    destinationAddress: prePopulatedUser?.spl_wallet ?? '',
    selectedUser: prePopulatedUser ?? null,
    selectedMint: mint ?? '',
    recipientType: prePopulatedUser ? 'user' : 'user',
    signature: ''
  })
  const [error, setError] = useState<string>('')

  const sendTokensMutation = useSendCoins({
    mint: state.selectedMint || (mint ?? '')
  })

  // Reset state when modal opens with new data (including pre-populated user)
  useEffect(() => {
    if (isOpen && state.step === 'input') {
      setState((prev) => ({
        ...prev,
        selectedUser: prePopulatedUser ?? null,
        destinationAddress: prePopulatedUser?.spl_wallet ?? '',
        selectedMint: mint ?? prev.selectedMint,
        recipientType: prePopulatedUser ? 'user' : prev.recipientType
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, prePopulatedUser?.user_id, mint])

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
    setError('') // Clear any previous errors

    try {
      const { signature } = await sendTokensMutation.mutateAsync({
        recipientWallet: state.destinationAddress as SolanaWalletAddress,
        amount: state.amount,
        // When sending to a user, pass their Ethereum address to derive user-bank ATA
        // Use erc_wallet first, fallback to wallet field
        recipientEthAddress:
          state.selectedUser?.erc_wallet ?? state.selectedUser?.wallet,
        source: 'send_tokens_modal',
        recipientHandle: state.selectedUser?.handle
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
        // This error should no longer occur as we now automatically create
        // user-bank accounts in the transaction. If it still occurs, it's likely
        // a different issue or the account creation failed.
        errorMessage =
          'Failed to create recipient token account. Please try again.'
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
    // Don't close if AppKit modal is open (wallet connection in progress)
    if (isAppKitModalOpenRef.current) {
      return
    }
    closeModal()
    const { user: prePopulatedUser } = data ?? {}
    setState({
      step: 'input',
      amount: BigInt(0),
      amountString: '',
      destinationAddress: prePopulatedUser?.spl_wallet ?? '',
      selectedUser: prePopulatedUser ?? null,
      selectedMint: mint ?? '',
      recipientType: 'user',
      signature: ''
    })
    setError('')
  }

  if (!isOpen || !mint) return null

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      title={state.step === 'confirm' ? 'Confirm Details' : walletMessages.send}
      size='m'
      dismissOnClickOutside={
        state.step === 'input' && !isAppKitModalOpenRef.current
      }
      showDismissButton={state.step === 'input'}
    >
      {state.step === 'input' ? (
        <SendTokensInput
          mint={mint}
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
          onClose={handleClose}
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
    </ResponsiveModal>
  )
}

export default SendTokensModal
