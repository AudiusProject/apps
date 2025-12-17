import { useState, useEffect } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { makeSolanaTransactionLink } from '@audius/common/utils'
import { FixedDecimal } from '@audius/fixed-decimal'
import {
  Button,
  Flex,
  Text,
  Hint,
  Divider,
  CompletionCheck,
  IconExternalLink,
  PlainButton
} from '@audius/harmony'
import cn from 'classnames'

import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { ProfileInfo } from 'components/profile-info/ProfileInfo'

import { ContentWrapper } from '../oauth-login-page/components/ContentWrapper'

import styles from './OAuthPayPage.module.css'
import { useOAuthPaySetup } from './hooks'
import { messages } from './messages'

export const OAuthPayPage = () => {
  const { data: account } = useCurrentAccountUser()
  const [error, setError] = useState<string | null>(null)

  const {
    recipient,
    amount,
    mint,
    tokenInfo,
    tokenBalance,
    balanceLoading,
    hasSufficientBalance,
    userHoldsMint,
    isSubmitting,
    queryParamsError,
    display,
    isLoggedIn,
    transactionSignature,
    handleConfirm,
    handleCancel,
    handleSuccessClose
  } = useOAuthPaySetup({
    onError: (errorMessage) => {
      setError(errorMessage)
    }
  })

  const formatAmount = (amount: bigint | null) => {
    if (!amount || !tokenInfo) return '0'
    return new FixedDecimal(amount, tokenInfo.decimals).toLocaleString(
      'en-US',
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: tokenInfo.decimals
      }
    )
  }

  // Determine if confirm button should be disabled
  const isConfirmDisabled =
    !isLoggedIn ||
    !recipient ||
    !amount ||
    !mint ||
    !tokenInfo ||
    balanceLoading ||
    !hasSufficientBalance ||
    !userHoldsMint ||
    isSubmitting ||
    !!queryParamsError ||
    !!error

  // Determine error message to show
  const displayError = queryParamsError || error

  // Auto-close success screen after 1 second
  useEffect(() => {
    if (transactionSignature) {
      const timer = setTimeout(() => {
        handleSuccessClose()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [transactionSignature, handleSuccessClose])

  if (queryParamsError) {
    return (
      <ContentWrapper display={display ?? 'popup'}>
        <div className={cn(styles.centeredContent, styles.titleContainer)}>
          <span className={styles.errorText}>{queryParamsError}</span>
        </div>
      </ContentWrapper>
    )
  }

  if (balanceLoading || !tokenInfo) {
    return (
      <ContentWrapper display={display ?? 'popup'}>
        <Flex p='4xl' alignItems='center' justifyContent='center'>
          <LoadingSpinner className={styles.loadingStateSpinner} />
        </Flex>
      </ContentWrapper>
    )
  }

  // Show success screen if transaction completed
  if (transactionSignature) {
    return (
      <ContentWrapper display={display ?? 'popup'}>
        <div className={styles.container}>
          <Flex alignItems='center' direction='column'>
            <Text variant='heading' size='l' className={styles.title}>
              {messages.confirmTransaction}
            </Text>
          </Flex>

          <div className={styles.formArea}>
            <Flex direction='column' gap='xl' p='xl'>
              {/* Amount Info */}
              <Flex direction='column' gap='m'>
                <Flex direction='column' gap='xs'>
                  <Text variant='heading' size='s' color='subdued'>
                    {messages.sent}
                  </Text>
                  <Text variant='heading' size='s' color='default'>
                    -{formatAmount(amount)}{' '}
                    {tokenInfo?.symbol ? `$${tokenInfo.symbol}` : ''}
                  </Text>
                </Flex>
              </Flex>

              <Divider orientation='horizontal' color='default' />

              {/* Address Container */}
              <Flex direction='column' gap='m'>
                <Text variant='heading' size='s' color='subdued'>
                  {messages.recipient}
                </Text>
                <Text
                  variant='body'
                  size='m'
                  color='default'
                  css={{ wordBreak: 'break-all' }}
                >
                  {recipient}
                </Text>
                <PlainButton
                  variant='subdued'
                  css={{ alignSelf: 'flex-start' }}
                  onClick={() => {
                    window.open(
                      makeSolanaTransactionLink(transactionSignature),
                      '_blank'
                    )
                  }}
                  iconRight={IconExternalLink}
                >
                  {messages.viewOnSolana}
                </PlainButton>
              </Flex>

              <Flex gap='s' alignItems='center'>
                <CompletionCheck value='complete' />
                <Text variant='heading' size='s' color='default'>
                  {messages.transactionComplete}
                </Text>
              </Flex>
            </Flex>
          </div>
        </div>
      </ContentWrapper>
    )
  }

  return (
    <ContentWrapper display={display}>
      <div className={styles.container}>
        <Flex alignItems='center' direction='column'>
          <Text variant='heading' size='l' className={styles.title}>
            {messages.confirmTransaction}
          </Text>
        </Flex>

        <div className={styles.formArea}>
          {isLoggedIn ? (
            <div className={styles.userInfoContainer}>
              <Text
                variant='body'
                size='m'
                css={{ color: 'var(--harmony-n-600)' }}
              >
                {messages.signedInAs}
              </Text>
              <div className={styles.tile}>
                <ProfileInfo
                  displayNameClassName={styles.userInfoDisplayName}
                  handleClassName={styles.userInfoHandle}
                  centered={false}
                  imgClassName={styles.profileImg}
                  className={styles.userInfo}
                  user={account}
                />
              </div>

              <Divider
                orientation='horizontal'
                css={{
                  marginTop: 'var(--harmony-unit-4)',
                  marginBottom: 'var(--harmony-unit-4)'
                }}
              />

              {/* Transaction Details */}
              <Flex direction='column' gap='m'>
                <Flex direction='column' gap='xs'>
                  <Text variant='heading' size='s' color='subdued'>
                    {messages.balance}
                  </Text>
                  <Text variant='body' size='l'>
                    {tokenBalance?.balance.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }) ?? '0.00'}{' '}
                    {tokenInfo?.symbol ? `$${tokenInfo.symbol}` : ''}
                  </Text>
                </Flex>

                <Flex direction='column' gap='xs'>
                  <Text variant='heading' size='s' color='subdued'>
                    {messages.recipient}
                  </Text>
                  <Text
                    variant='body'
                    size='l'
                    css={{ wordBreak: 'break-all' }}
                  >
                    {recipient}
                  </Text>
                </Flex>

                <Flex direction='column' gap='xs'>
                  <Text variant='heading' size='s' color='subdued'>
                    {messages.amount}
                  </Text>
                  <Text variant='body' size='l'>
                    {formatAmount(amount)}{' '}
                    {tokenInfo?.symbol ? `$${tokenInfo.symbol}` : ''}
                  </Text>
                </Flex>

                <Flex direction='column' gap='xs'>
                  <Text variant='heading' size='s' color='subdued'>
                    {messages.coin}
                  </Text>
                  <Text variant='body' size='l'>
                    {tokenInfo?.name || ''}
                  </Text>
                </Flex>
              </Flex>

              {/* Error Messages */}
              {!userHoldsMint && (
                <Hint css={{ marginTop: 'var(--harmony-unit-4)' }}>
                  <Text variant='body' size='s' color='danger'>
                    {messages.userDoesNotHoldMint}
                  </Text>
                </Hint>
              )}

              {userHoldsMint && !hasSufficientBalance && (
                <Hint css={{ marginTop: 'var(--harmony-unit-4)' }}>
                  <Text variant='body' size='s' color='danger'>
                    {messages.insufficientBalance}
                  </Text>
                </Hint>
              )}

              {displayError && (
                <div className={styles.generalErrorContainer}>
                  <span className={styles.errorText}>{displayError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <Flex gap='s' row css={{ marginTop: 'var(--harmony-unit-6)' }}>
                <Button
                  variant='secondary'
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  fullWidth
                >
                  {messages.cancel}
                </Button>
                <Button
                  variant='primary'
                  onClick={handleConfirm}
                  disabled={isConfirmDisabled}
                  isLoading={isSubmitting}
                  fullWidth
                >
                  {messages.confirm}
                </Button>
              </Flex>
            </div>
          ) : (
            <div className={styles.userInfoContainer}>
              <Text variant='body' size='m' color='subdued'>
                Please sign in to confirm this transaction.
              </Text>
            </div>
          )}
        </div>
      </div>
    </ContentWrapper>
  )
}
