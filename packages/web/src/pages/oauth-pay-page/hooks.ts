import { useCallback, useMemo, useState } from 'react'

import {
  useArtistCoin,
  useCoinBalance,
  transformArtistCoinToTokenInfo,
  useSendCoins,
  useCurrentAccountUser
} from '@audius/common/api'
import { useUserbank } from '@audius/common/hooks'
import { SolanaWalletAddress } from '@audius/common/models'
import { isValidSolAddress } from '@audius/common/store'
import * as queryString from 'query-string'
import { useLocation } from 'react-router'

import { getIsRedirectValid } from '../oauth-login-page/utils'

import { messages } from './messages'
import { Display } from './types'

const useParsedPayParams = () => {
  const { search } = useLocation()

  const {
    recipient,
    amount,
    mint,
    state,
    redirect_uri: redirectUri,
    response_mode: responseMode,
    origin,
    display: displayQueryParam
  } = queryString.parse(search)

  const parsedRedirectUri = useMemo<'postmessage' | URL | null>(() => {
    if (redirectUri && typeof redirectUri === 'string') {
      if (redirectUri.toLowerCase() === 'postmessage') {
        return 'postmessage'
      }
      try {
        return new URL(decodeURIComponent(redirectUri))
      } catch {
        return null
      }
    }
    return null
  }, [redirectUri])

  const isRedirectValid = useMemo(() => {
    return getIsRedirectValid({ parsedRedirectUri, redirectUri })
  }, [parsedRedirectUri, redirectUri])

  const parsedOrigin = useMemo(() => {
    if (origin && typeof origin === 'string') {
      try {
        return new URL(origin)
      } catch {
        return null
      }
    }
    return null
  }, [origin])

  const { error } = useMemo(() => {
    let error: string | null = null

    if (isRedirectValid === false) {
      error = messages.redirectURIInvalidError
    } else if (parsedRedirectUri === 'postmessage' && !parsedOrigin) {
      error = messages.originInvalidError
    } else if (
      responseMode &&
      responseMode !== 'query' &&
      responseMode !== 'fragment'
    ) {
      error = messages.responseModeError
    } else if (!recipient || typeof recipient !== 'string') {
      error = messages.missingParamsError
    } else if (!isValidSolAddress(recipient as SolanaWalletAddress)) {
      error = messages.invalidRecipientError
    } else if (!amount || typeof amount !== 'string') {
      error = messages.missingParamsError
    } else {
      // Validate amount is a valid bigint
      try {
        const amountBigInt = BigInt(amount)
        if (amountBigInt <= 0) {
          error = messages.invalidAmountError
        }
      } catch {
        error = messages.invalidAmountError
      }
    }

    if (!mint || typeof mint !== 'string') {
      error = messages.missingMintError
    }

    return { error }
  }, [
    isRedirectValid,
    parsedOrigin,
    parsedRedirectUri,
    recipient,
    amount,
    mint,
    responseMode
  ])

  const display: Display =
    displayQueryParam === 'fullScreen' ? 'fullScreen' : 'popup'

  return {
    recipient: recipient as string | undefined,
    amount: amount as string | undefined,
    mint: mint as string | undefined,
    state,
    redirectUri,
    responseMode,
    origin,
    parsedRedirectUri,
    isRedirectValid,
    parsedOrigin,
    error,
    display
  }
}

export const useOAuthPaySetup = ({
  onError
}: {
  onError: (errorMessage: string) => void
}) => {
  const {
    recipient,
    amount,
    mint,
    state,
    responseMode,
    parsedRedirectUri,
    isRedirectValid,
    parsedOrigin,
    error: queryParamsError,
    display
  } = useParsedPayParams()

  const { data: account } = useCurrentAccountUser()
  const isLoggedIn = Boolean(account?.user_id)

  // Get the user-bank address for the specific mint (the one used to send tokens)
  const { userBankAddress } = useUserbank(mint ?? undefined)
  const currentUserWallet = userBankAddress

  // Get token info
  const { data: coin } = useArtistCoin(mint ?? '')
  const tokenInfo = coin ? transformArtistCoinToTokenInfo(coin) : undefined

  // Get user balance for the mint
  const { data: tokenBalance, isLoading: balanceLoading } = useCoinBalance({
    mint: mint ?? '',
    includeExternalWallets: false,
    includeStaked: false
  })

  // Send coins mutation
  const sendCoinsMutation = useSendCoins({ mint: mint ?? '' })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [transactionSignature, setTransactionSignature] = useState<
    string | null
  >(null)

  // Parse amount as bigint
  const amountBigInt = useMemo(() => {
    if (!amount) return null
    try {
      return BigInt(amount)
    } catch {
      return null
    }
  }, [amount])

  // Check if user has sufficient balance
  const hasSufficientBalance = useMemo(() => {
    if (!tokenBalance || !amountBigInt) return false
    return tokenBalance.balance.value >= amountBigInt
  }, [tokenBalance, amountBigInt])

  // Check if user holds the mint at all
  const userHoldsMint = useMemo(() => {
    if (!tokenBalance) return false
    return tokenBalance.balance.value > BigInt(0)
  }, [tokenBalance])

  const formResponseAndPostMessage = useCallback(
    async (result: { signature?: string; error?: string; wallet?: string }) => {
      if (isRedirectValid === true) {
        if (parsedRedirectUri === 'postmessage') {
          if (parsedOrigin) {
            if (!window.opener) {
              onError(messages.noWindowError)
            } else {
              const message: {
                state?: string
                signature?: string
                error?: string
                wallet?: string
              } = {}
              if (state != null) {
                message.state = state as string
              }
              if (result.signature) {
                message.signature = result.signature
              }
              if (result.wallet) {
                message.wallet = result.wallet
              }
              if (result.error) {
                message.error = result.error
              }
              window.opener.postMessage(message, parsedOrigin.origin)
            }
          }
        } else {
          // URL redirect mode (used for fullScreen mode)
          if (responseMode && responseMode === 'query') {
            if (state != null) {
              parsedRedirectUri!.searchParams.append('state', state as string)
            }
            if (result.signature) {
              parsedRedirectUri!.searchParams.append(
                'signature',
                result.signature
              )
            }
            if (result.wallet) {
              parsedRedirectUri!.searchParams.append('wallet', result.wallet)
            }
            if (result.error) {
              parsedRedirectUri!.searchParams.append('error', result.error)
            }
          } else {
            // Fragment mode (default for fullScreen)
            const statePart = state != null ? `state=${state}&` : ''
            const signaturePart = result.signature
              ? `signature=${result.signature}`
              : ''
            const walletPart = result.wallet ? `wallet=${result.wallet}` : ''
            const errorPart = result.error ? `error=${result.error}` : ''
            const parts = [
              statePart,
              signaturePart,
              walletPart,
              errorPart
            ].filter(Boolean)
            parsedRedirectUri!.hash = `#${parts.join('&')}`
          }
          window.location.href = parsedRedirectUri!.toString()
        }
      }
    },
    [
      isRedirectValid,
      parsedOrigin,
      parsedRedirectUri,
      responseMode,
      state,
      onError
    ]
  )

  const handleConfirm = useCallback(async () => {
    if (!recipient || !amountBigInt || !mint) {
      onError(messages.missingParamsError)
      return
    }

    if (!hasSufficientBalance) {
      onError(messages.insufficientBalance)
      return
    }

    setIsSubmitting(true)
    try {
      const { signature } = await sendCoinsMutation.mutateAsync({
        recipientWallet: recipient as SolanaWalletAddress,
        amount: amountBigInt
      })

      // Store signature to show success screen
      setTransactionSignature(signature)
      setIsSubmitting(false)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : messages.transactionFailed
      await formResponseAndPostMessage({ error: errorMessage })
      onError(errorMessage)
      setIsSubmitting(false)
    }
  }, [
    recipient,
    amountBigInt,
    mint,
    hasSufficientBalance,
    formResponseAndPostMessage,
    sendCoinsMutation,
    onError
  ])

  // Handle closing after success screen is shown
  const handleSuccessClose = useCallback(async () => {
    if (transactionSignature && currentUserWallet) {
      await formResponseAndPostMessage({
        signature: transactionSignature,
        wallet: currentUserWallet
      })
      // Small delay to ensure message is sent before closing
      setTimeout(() => {
        if (window.opener) {
          window.close()
        }
      }, 100)
    }
  }, [transactionSignature, currentUserWallet, formResponseAndPostMessage])

  const handleCancel = useCallback(() => {
    // Close the window when user cancels
    if (window.opener) {
      window.close()
    }
  }, [])

  return {
    recipient,
    amount: amountBigInt,
    mint,
    state,
    tokenInfo,
    tokenBalance,
    balanceLoading,
    hasSufficientBalance,
    userHoldsMint,
    isSubmitting,
    queryParamsError,
    display,
    isLoggedIn,
    account,
    transactionSignature,
    handleConfirm,
    handleCancel,
    handleSuccessClose
  }
}
