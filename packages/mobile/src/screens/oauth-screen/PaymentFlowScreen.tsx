import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  useCurrentAccountUser,
  useFanClub,
  useCoinBalance,
  transformFanClubToTokenInfo,
  useSendCoins
} from '@audius/common/api'
import { useUserbank } from '@audius/common/hooks'
import type { SolanaWalletAddress } from '@audius/common/models'
import { FixedDecimal } from '@audius/fixed-decimal'
import { useNavigation } from '@react-navigation/native'
import { ActivityIndicator, Linking, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Button,
  Divider,
  Flex,
  Paper,
  Text,
  useTheme
} from '@audius/harmony-native'

import { SignedInAs } from './components/SignedInAs'
import { messages } from './messages'
import type { ParsedParams } from './types'
import { buildRedirectUrl, buildErrorUrl } from './utils'

type Props = { params: ParsedParams }

export const PaymentFlowScreen = ({ params }: Props) => {
  const {
    recipient,
    amount: amountStr,
    mint,
    state,
    redirectUri,
    responseMode
  } = params

  const { color, spacing } = useTheme()
  const { bottom: bottomInset } = useSafeAreaInsets()
  const navigation = useNavigation()

  const { data: account } = useCurrentAccountUser()
  const isLoggedIn = Boolean(account?.user_id)

  const {
    data: coin,
    isPending: coinLoading,
    isError: coinError
  } = useFanClub(mint ?? '')
  const tokenInfo = useMemo(
    () => (coin ? transformFanClubToTokenInfo(coin) : undefined),
    [coin]
  )
  const {
    data: tokenBalance,
    isPending: balanceLoading,
    isError: balanceError
  } = useCoinBalance({
    mint: mint ?? '',
    includeExternalWallets: false,
    includeStaked: false
  })
  const { userBankAddress: currentUserWallet } = useUserbank(mint ?? undefined)
  const sendCoinsMutation = useSendCoins({ mint: mint ?? '' })

  const [transactionSignature, setTransactionSignature] = useState<
    string | null
  >(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const amountBigInt = useMemo(() => {
    if (!amountStr) return null
    try {
      return BigInt(amountStr)
    } catch {
      return null
    }
  }, [amountStr])

  const hasSufficientBalance = useMemo(() => {
    if (!tokenBalance || !amountBigInt) return false
    return tokenBalance.balance.value >= amountBigInt
  }, [tokenBalance, amountBigInt])

  const userHoldsMint = useMemo(() => {
    if (!tokenBalance) return false
    return tokenBalance.balance.value > BigInt(0)
  }, [tokenBalance])

  const formatAmount = (val: bigint | null) => {
    if (!val || !tokenInfo) return '0'
    return new FixedDecimal(val, tokenInfo.decimals).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: tokenInfo.decimals
    })
  }

  const handleConfirm = useCallback(async () => {
    if (!recipient || !amountBigInt || !mint) {
      setSubmitError(messages.missingParamsError)
      return
    }
    if (!hasSufficientBalance) {
      setSubmitError(messages.insufficientBalance)
      return
    }
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const { signature } = await sendCoinsMutation.mutateAsync({
        recipientWallet: recipient as SolanaWalletAddress,
        amount: amountBigInt,
        source: 'oauth_pay_page'
      })
      setTransactionSignature(signature)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : messages.miscError)
    } finally {
      setIsSubmitting(false)
    }
  }, [recipient, amountBigInt, mint, hasSufficientBalance, sendCoinsMutation])

  const closeScreen = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      navigation.navigate('HomeStack' as never)
    }
  }, [navigation])

  const handleSuccessClose = useCallback(async () => {
    if (transactionSignature && currentUserWallet && redirectUri) {
      await Linking.openURL(
        buildRedirectUrl(
          redirectUri,
          { signature: transactionSignature, wallet: currentUserWallet },
          state,
          responseMode
        )
      ).catch(() => {})
    }
    closeScreen()
  }, [
    transactionSignature,
    currentUserWallet,
    redirectUri,
    state,
    responseMode,
    closeScreen
  ])

  const handleCancel = useCallback(async () => {
    if (redirectUri) {
      try {
        await Linking.openURL(buildErrorUrl(redirectUri, state, responseMode))
      } catch {}
    }
    closeScreen()
  }, [redirectUri, state, responseMode, closeScreen])

  // Auto-close success screen after 1.5s
  useEffect(() => {
    if (!transactionSignature) return
    const timer = setTimeout(() => handleSuccessClose(), 1500)
    return () => clearTimeout(timer)
  }, [transactionSignature, handleSuccessClose])

  const scrollContentStyle = {
    flexGrow: 1,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.unit10,
    paddingBottom: spacing.xl + bottomInset
  }

  const dataLoading = coinLoading || balanceLoading

  if (coinError || balanceError || (!dataLoading && !tokenInfo)) {
    return (
      <Flex
        flex={1}
        alignItems='center'
        justifyContent='center'
        p='xl'
        backgroundColor='surface1'
      >
        <Text variant='body' size='m' color='danger' textAlign='center'>
          {messages.miscError}
        </Text>
        <Flex mt='l' w='100%'>
          <Button variant='secondary' fullWidth onPress={handleCancel}>
            {messages.cancelButton}
          </Button>
        </Flex>
      </Flex>
    )
  }

  if (dataLoading || !tokenInfo) {
    return (
      <Flex
        flex={1}
        alignItems='center'
        justifyContent='center'
        backgroundColor='surface1'
      >
        <ActivityIndicator size='large' color={color.primary.primary} />
      </Flex>
    )
  }

  if (transactionSignature) {
    return (
      <Flex
        flex={1}
        alignItems='center'
        justifyContent='center'
        p='xl'
        backgroundColor='surface1'
        style={{ paddingBottom: spacing.xl + bottomInset }}
      >
        <Text variant='heading' size='s' color='default' textAlign='center'>
          {messages.transactionComplete}
        </Text>
        <Flex mt='l'>
          <Text variant='body' size='m' color='subdued' textAlign='center'>
            -{formatAmount(amountBigInt)}{' '}
            {tokenInfo.symbol ? `$${tokenInfo.symbol}` : ''}
          </Text>
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex flex={1} backgroundColor='surface1'>
      <ScrollView contentContainerStyle={scrollContentStyle}>
        <Flex direction='column' gap='xl'>
          <Text variant='heading' size='s' color='default' textAlign='center'>
            {messages.confirmTransaction}
          </Text>

          {isLoggedIn && account ? (
            <>
              <SignedInAs account={account} />

              <Paper shadow='flat' backgroundColor='white' borderRadius='s'>
                <Flex p='l' direction='column' gap='l'>
                  <Flex direction='column' gap='xs'>
                    <Text variant='body' size='s' color='subdued'>
                      {messages.balance}
                    </Text>
                    <Text variant='body' size='m' color='default'>
                      {tokenBalance?.balance.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }) ?? '0.00'}{' '}
                      {tokenInfo.symbol ? `$${tokenInfo.symbol}` : ''}
                    </Text>
                  </Flex>
                  <Divider />
                  <Flex direction='column' gap='xs'>
                    <Text variant='body' size='s' color='subdued'>
                      {messages.amount}
                    </Text>
                    <Text variant='body' size='m' color='default'>
                      {formatAmount(amountBigInt)}{' '}
                      {tokenInfo.symbol ? `$${tokenInfo.symbol}` : ''}
                    </Text>
                  </Flex>
                  <Divider />
                  <Flex direction='column' gap='xs'>
                    <Text variant='body' size='s' color='subdued'>
                      {messages.coin}
                    </Text>
                    <Text variant='body' size='m' color='default'>
                      {tokenInfo.name ?? ''}
                    </Text>
                  </Flex>
                  <Divider />
                  <Flex direction='column' gap='xs'>
                    <Text variant='body' size='s' color='subdued'>
                      {messages.recipient}
                    </Text>
                    <Text variant='body' size='s' color='default'>
                      {recipient}
                    </Text>
                  </Flex>
                </Flex>
              </Paper>

              {!userHoldsMint && (
                <Text variant='body' size='s' color='danger'>
                  {messages.userDoesNotHoldMint}
                </Text>
              )}
              {userHoldsMint && !hasSufficientBalance && (
                <Text variant='body' size='s' color='danger'>
                  {messages.insufficientBalance}
                </Text>
              )}
              {submitError ? (
                <Text variant='body' size='s' color='danger'>
                  {submitError}
                </Text>
              ) : null}

              <Flex direction='column' gap='m'>
                <Button
                  variant='primary'
                  fullWidth
                  isLoading={isSubmitting}
                  disabled={!hasSufficientBalance || !userHoldsMint}
                  onPress={handleConfirm}
                >
                  {messages.confirm}
                </Button>
                <Button variant='secondary' fullWidth onPress={handleCancel}>
                  {messages.cancelButton}
                </Button>
              </Flex>
            </>
          ) : (
            <>
              <Text variant='body' size='m' color='subdued' textAlign='center'>
                {messages.signInFirst}
              </Text>
              <Button variant='secondary' fullWidth onPress={handleCancel}>
                {messages.cancelButton}
              </Button>
            </>
          )}
        </Flex>
      </ScrollView>
    </Flex>
  )
}
