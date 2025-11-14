import { useCallback, useContext, useEffect, useState } from 'react'

import {
  ConnectedWallet,
  getExternalWalletBalanceOptions,
  useCurrentAccountUser,
  useQueryContext,
  useArtistCreatedCoin
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { launchpadMessages } from '@audius/common/messages'
import {
  Chain,
  Feature,
  Name,
  LaunchpadFormValues
} from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { TOKEN_LISTING_MAP, useCoinSuccessModal } from '@audius/common/store'
import {
  getUserSocialLinks,
  route,
  shortenSPLAddress
} from '@audius/common/utils'
import { wAUDIO } from '@audius/fixed-decimal'
import {
  Flex,
  IconArtistCoin,
  IconCheck,
  IconClose,
  Text
} from '@audius/harmony'
import { solana } from '@reown/appkit/networks'
import { useAppKitAccount as useExternalWalletAccount } from '@reown/appkit/react'
import { useQueryClient } from '@tanstack/react-query'
import { Form, Formik, useFormikContext } from 'formik'
import { Navigate, useNavigate } from 'react-router-dom-v5-compat'

import { appkitModal } from 'app/ReownAppKitModal'
import { Header } from 'components/header/desktop/Header'
import { useMobileHeader } from 'components/header/mobile/hooks'
import Page from 'components/page/Page'
import { ToastContext } from 'components/toast/ToastContext'
import { AlreadyAssociatedError } from 'hooks/useConnectAndAssociateWallets'
import { useConnectExternalWallets } from 'hooks/useConnectExternalWallets'
import { useExternalWalletSwap } from 'hooks/useExternalWalletSwap'
import { LAUNCHPAD_COIN_DECIMALS, useLaunchCoin } from 'hooks/useLaunchCoin'
import { make, track } from 'services/analytics'
import { reportToSentry } from 'store/errors/reportToSentry'

import { ConnectedWalletHeader } from './components'
import {
  InsufficientBalanceModal,
  LaunchpadSubmitModal
} from './components/LaunchpadModals'
import { LAUNCHPAD_COIN_DESCRIPTION, MIN_SOL_BALANCE, Phase } from './constants'
import { BuyCoinPage, ReviewPage, SetupPage, SplashPage } from './pages'
import { useLaunchpadAnalytics } from './utils'
import { useLaunchpadFormSchema } from './validation'

const messages = {
  title: 'Create Your Artist Coin',
  walletAdded: 'Wallet connected successfully',
  errors: {
    coinCreationFailed: 'Coin creation failed. Please try again.',
    firstBuyFailed: 'Coin purchase failed. Please try again.',
    firstBuyFailedToast:
      'Coin created! Your purchase failed, please try again.',
    unknownError:
      'An unknown error occurred. The Audius team has been notified.',
    noSolanaWalletFound: 'No Solana wallet found',
    failedToCheckWalletBalance:
      'Failed to check wallet balance. Please try again.'
  }
}

const getArtistSocialLinks = getUserSocialLinks

const LaunchpadPageContent = ({
  submitErrorText,
  submitButtonText
}: {
  submitErrorText?: string
  submitButtonText?: string
}) => {
  const [phase, setPhase] = useState(Phase.SPLASH)
  const { resetForm, validateForm } = useFormikContext()
  const externalWalletAccount = useExternalWalletAccount()
  const connectedWallet = externalWalletAccount?.address
  const queryClient = useQueryClient()
  const queryContext = useQueryContext()
  const { toast } = useContext(ToastContext)
  const {
    trackSplashGetStarted,
    trackSetupContinue,
    trackFormBack,
    trackReviewContinue,
    trackWalletConnectSuccess,
    trackWalletConnectError,
    trackWalletInsufficientBalance
  } = useLaunchpadAnalytics({
    externalWalletAddress: connectedWallet
  })
  const [isInsufficientBalanceModalOpen, setIsInsufficientBalanceModalOpen] =
    useState(false)

  // Set up mobile header with icon
  useMobileHeader({
    title: launchpadMessages.page.title
  })

  const header = (
    <Header
      primary={launchpadMessages.page.title}
      icon={IconArtistCoin}
      rightDecorator={
        connectedWallet && phase !== Phase.SPLASH ? (
          <ConnectedWalletHeader connectedWalletAddress={connectedWallet} />
        ) : null
      }
    />
  )

  // NOTE: this hook specifically is after the wallet is both added & has sufficient balance
  const handleWalletAddSuccess = useCallback(
    (wallet: ConnectedWallet) => {
      setPhase(Phase.SETUP)
      toast(
        <Flex gap='xs' direction='column'>
          <Text>{launchpadMessages.page.walletAdded}</Text>
          <Text>{shortenSPLAddress(wallet.address)}</Text>
        </Flex>
      )
    },
    [setPhase, toast]
  )

  // Wallet connection handlers
  const handleWalletConnectSuccess = useCallback(
    async (newWallets: {
      solana: string | undefined
      eth: string | undefined
    }) => {
      const { solana: connectedWallet } = newWallets
      if (!connectedWallet) {
        alert(messages.errors.noSolanaWalletFound)
        reportToSentry({
          error: new Error(messages.errors.noSolanaWalletFound),
          name: 'Launchpad Page',
          feature: Feature.ArtistCoins,
          additionalInfo: {
            newWallets,
            externalWalletAccount
          }
        })
        return
      }

      const walletBalanceData = await queryClient.fetchQuery({
        ...getExternalWalletBalanceOptions(queryContext, {
          walletAddress: connectedWallet,
          mint: TOKEN_LISTING_MAP.SOL.address
        }),
        staleTime: 0 // dont use cached values
      })
      const walletSolBalance = Number(walletBalanceData.value)
      const isValidWalletBalance = walletSolBalance >= MIN_SOL_BALANCE
      if (isValidWalletBalance) {
        trackWalletConnectSuccess(connectedWallet, walletSolBalance)
      } else {
        trackWalletInsufficientBalance(connectedWallet, walletSolBalance)
      }
      try {
        if (isValidWalletBalance) {
          handleWalletAddSuccess({
            address: connectedWallet,
            chain: Chain.Sol
          })
        } else {
          setIsInsufficientBalanceModalOpen(true)
        }
      } catch (error) {
        alert(messages.errors.failedToCheckWalletBalance)
        reportToSentry({
          error: error instanceof Error ? error : new Error(error as string),
          name: 'Launchpad Page',
          feature: Feature.ArtistCoins,
          additionalInfo: {
            newWallets,
            externalWalletAccount
          }
        })
      }
    },
    [
      queryClient,
      queryContext,
      externalWalletAccount,
      trackWalletConnectSuccess,
      trackWalletInsufficientBalance,
      handleWalletAddSuccess
    ]
  )

  // NOTE: an error here can also mean that a wallet has already been added recently
  const handleWalletConnectError = useCallback(
    async (error: unknown) => {
      // If wallet is already linked, continue with the flow
      if (error instanceof AlreadyAssociatedError) {
        const lastConnectedWallet = externalWalletAccount?.address
        if (lastConnectedWallet) {
          const walletBalanceData = await queryClient.fetchQuery({
            ...getExternalWalletBalanceOptions(queryContext, {
              walletAddress: lastConnectedWallet,
              mint: TOKEN_LISTING_MAP.SOL.address
            }),
            staleTime: 0 // dont use cached values
          })
          const walletSolBalance = Number(walletBalanceData.value)
          const isValidWalletBalance = walletSolBalance >= MIN_SOL_BALANCE
          if (isValidWalletBalance) {
            trackWalletConnectSuccess(lastConnectedWallet, walletSolBalance)
            handleWalletAddSuccess({
              address: lastConnectedWallet,
              chain: Chain.Sol
            })
          } else {
            trackWalletInsufficientBalance(
              lastConnectedWallet,
              walletSolBalance
            )
            setIsInsufficientBalanceModalOpen(true)
          }
        }
      } else {
        trackWalletConnectError(error)
      }
    },
    [
      externalWalletAccount?.address,
      queryClient,
      queryContext,
      trackWalletConnectSuccess,
      handleWalletAddSuccess,
      trackWalletInsufficientBalance,
      trackWalletConnectError
    ]
  )

  const { openAppKitModal, isPending: isWalletConnectPending } =
    useConnectExternalWallets(
      handleWalletConnectSuccess,
      handleWalletConnectError
    )

  const handleSplashContinue = useCallback(async () => {
    // Switch to Solana network to prioritize SOL wallets
    await appkitModal.switchNetwork(solana)
    trackSplashGetStarted()
    await appkitModal.disconnect('solana')
    openAppKitModal('solana')
  }, [openAppKitModal, trackSplashGetStarted])

  const handleSetupContinue = useCallback(() => {
    setPhase(Phase.REVIEW)
    trackSetupContinue()
  }, [trackSetupContinue])

  const handleSetupBack = useCallback(async () => {
    resetForm()
    await validateForm()
    setPhase(Phase.SPLASH)
    trackFormBack()
  }, [resetForm, validateForm, trackFormBack])

  const handleReviewContinue = useCallback(() => {
    setPhase(Phase.BUY_COIN)
    trackReviewContinue()
  }, [trackReviewContinue])

  const handleReviewBack = useCallback(() => {
    setPhase(Phase.SETUP)
    trackFormBack()
  }, [trackFormBack])

  const handleBuyCoinBack = useCallback(() => {
    setPhase(Phase.REVIEW)
    trackFormBack()
  }, [trackFormBack])

  const renderCurrentPage = () => {
    switch (phase) {
      case Phase.SPLASH:
        return (
          <SplashPage
            onContinue={handleSplashContinue}
            isPending={isWalletConnectPending}
          />
        )
      case Phase.SETUP:
        return (
          <SetupPage
            onContinue={handleSetupContinue}
            onBack={handleSetupBack}
          />
        )
      case Phase.REVIEW:
        return (
          <ReviewPage
            onContinue={handleReviewContinue}
            onBack={handleReviewBack}
          />
        )
      case Phase.BUY_COIN:
        return (
          <BuyCoinPage
            onBack={handleBuyCoinBack}
            submitErrorText={submitErrorText}
            submitButtonText={submitButtonText}
          />
        )
      default:
        return (
          <SplashPage
            onContinue={handleSplashContinue}
            isPending={isWalletConnectPending}
          />
        )
    }
  }

  return (
    <>
      <InsufficientBalanceModal
        isOpen={isInsufficientBalanceModalOpen}
        onClose={() => setIsInsufficientBalanceModalOpen(false)}
      />
      <Page
        title={launchpadMessages.page.title}
        header={header}
        contentClassName='artist-coins-launchpad-page'
      >
        {renderCurrentPage()}
      </Page>
    </>
  )
}

export const LaunchpadPage = () => {
  const { data: currentUser } = useCurrentAccountUser()

  const { data: createdCoin } = useArtistCreatedCoin(currentUser?.user_id)
  const { isEnabled: isLaunchpadVerificationEnabled } = useFeatureFlag(
    FeatureFlags.LAUNCHPAD_VERIFICATION
  )
  const hasExistingArtistCoin = !!createdCoin

  const [isModalOpen, setIsModalOpen] = useState(false)
  const { toast } = useContext(ToastContext)
  const { validationSchema } = useLaunchpadFormSchema()
  const [formValues, setFormValues] = useState<LaunchpadFormValues | null>(null)

  const { onOpen: openCoinSuccessModal } = useCoinSuccessModal()
  const navigate = useNavigate()
  const externalWalletAccount = useExternalWalletAccount()
  const connectedWalletAddress = externalWalletAccount?.address
  const {
    trackCoinCreationStarted,
    trackCoinCreationFailure,
    trackCoinCreationSuccess,
    trackFirstBuyRetry
  } = useLaunchpadAnalytics({
    externalWalletAddress: connectedWalletAddress
  })

  // Launch coin mutation hook - this handles pool creation, sdk coin creation, and first buy transaction
  const {
    mutate: launchCoin,
    isPending: isLaunchCoinPending,
    isSuccess: isLaunchCoinFinished,
    data: launchCoinResponse,
    isError: uncaughtLaunchCoinError
  } = useLaunchCoin()

  // If something during coin launch hook fails, this errorMetadata is used to trigger recovery flows
  const errorMetadata = launchCoinResponse?.errorMetadata

  const isLaunchCoinError = launchCoinResponse?.isError
  const isPoolCreateError =
    isLaunchCoinError && !errorMetadata?.poolCreateConfirmed
  const isSdkCreateError =
    isLaunchCoinError &&
    errorMetadata?.poolCreateConfirmed &&
    !errorMetadata?.sdkCoinAdded
  const isFirstBuyError =
    isLaunchCoinError &&
    errorMetadata?.poolCreateConfirmed &&
    !errorMetadata?.firstBuyConfirmed &&
    errorMetadata?.requestedFirstBuy

  // This hook is used in the case where the first buy TX failed for some reason but the pool was created successfully
  // Since the pool is launched, we can retry the first buy transaction with a new jupiter swap TX
  const {
    mutate: swapTokens,
    isPending: isSwapRetryPending,
    isSuccess: isSwapRetryFinished,
    data: swapData
  } = useExternalWalletSwap()

  const isSwapRetryError = swapData?.error !== undefined
  const isSwapRetrySuccess = isSwapRetryFinished && !isSwapRetryError

  // Overall success, pending, and error states account for both hooks
  const isSuccess =
    (isLaunchCoinFinished && !isLaunchCoinError) || isSwapRetrySuccess
  const isPending = isLaunchCoinPending || isSwapRetryPending
  const isError =
    uncaughtLaunchCoinError || isLaunchCoinError || isSwapRetryError

  useEffect(() => {
    if (isLaunchCoinError) {
      const errorState = isPoolCreateError
        ? 'poolCreateFailed'
        : isFirstBuyError
          ? 'firstBuyFailed'
          : isSdkCreateError
            ? 'sdkCoinFailed'
            : 'unknownError'
      trackCoinCreationFailure(launchCoinResponse, errorState)
    }
  }, [
    isLaunchCoinError,
    launchCoinResponse,
    formValues,
    trackCoinCreationFailure,
    isPoolCreateError,
    isFirstBuyError,
    isSdkCreateError
  ])

  // If an error occurs after the pool is created, we close the modal to let the user resubmit via the swap retry flow
  useEffect(() => {
    if (isPoolCreateError) {
      setIsModalOpen(false)
    }
  }, [isPoolCreateError])

  // Handle successful coin creation
  useEffect(() => {
    if (isSuccess && launchCoinResponse && formValues) {
      trackCoinCreationSuccess(launchCoinResponse, formValues)
      // Show toast notification
      toast(
        <Flex gap='xs'>
          <IconCheck size='m' color='white' />
          <Text>{launchpadMessages.toast.coinCreated}</Text>
        </Flex>
      )

      // Navigate to the new coin's detail page
      navigate(route.coinPage(formValues.coinSymbol.toUpperCase()))

      // Open the success modal
      openCoinSuccessModal({
        mint: launchCoinResponse.newMint,
        name: formValues.coinName,
        ticker: formValues.coinSymbol.toUpperCase(),
        logoUri: launchCoinResponse.logoUri,
        amountUi: formValues.receiveAmount || '0',
        amountUsd: formValues.usdcValue || '0'
      })
    }
  }, [
    isLaunchCoinFinished,
    launchCoinResponse,
    openCoinSuccessModal,
    navigate,
    formValues,
    trackCoinCreationSuccess,
    isError,
    isSuccess,
    toast
  ])

  // If the swap retry fails close the modal again and let user attempt to resubmit if they want
  useEffect(() => {
    if (isSwapRetryError) {
      setIsModalOpen(false)
    }
  }, [isSwapRetryError])

  // If the first buy TX fails, we show a toast and close the modal
  // they are still able to attempt to resubmit
  useEffect(() => {
    if (isFirstBuyError) {
      setIsModalOpen(false)
      toast(messages.errors.firstBuyFailedToast, Infinity, {
        rightIcon: IconClose
      })
    }
  }, [isFirstBuyError, toast])

  // Handle swap results for first buy transaction
  useEffect(() => {
    if (isSwapRetryError) {
      // Show error toast but keep modal open for retry
      toast(messages.errors.firstBuyFailed, Infinity, {
        rightIcon: IconClose
      })
    }
  }, [isSwapRetryError, toast])

  const handleSubmit = useCallback(
    async (formValues: LaunchpadFormValues) => {
      // Store form values for success modal
      setFormValues(formValues)

      if (!currentUser || !connectedWalletAddress) {
        toast(messages.errors.unknownError, Infinity, {
          rightIcon: IconClose
        })
        reportToSentry({
          error: new Error(
            'Unable to submit launchpad form. No user or connected wallet found'
          ),
          name: 'Launchpad Submit Error',
          feature: Feature.ArtistCoins,
          additionalInfo: {
            currentUser,
            connectedWalletAddress,
            formValues
          }
        })
        throw new Error('No user or connected wallet found')
      }

      setIsModalOpen(true)

      const audioAmountBigNumber = formValues.payAmount
        ? wAUDIO(formValues.payAmount).value
        : undefined
      const initialBuyAmountAudio =
        audioAmountBigNumber && audioAmountBigNumber > 0
          ? audioAmountBigNumber.toString()
          : undefined

      // Check if we've already attempted to submit and need to retry the first buy transaction instead of creating a new pool
      if (isFirstBuyError) {
        // Recover the mint address from the error metadata
        const mintAddress =
          launchCoinResponse.newMint || errorMetadata?.coinMetadata?.mint
        if (formValues.payAmount && mintAddress) {
          trackFirstBuyRetry(launchCoinResponse)
          // Retry the first buy transaction with a new swap TX
          swapTokens({
            inputMint: TOKEN_LISTING_MAP.AUDIO.address,
            outputMint: mintAddress,
            amountUi: Number(formValues.payAmount),
            walletAddress: connectedWalletAddress,
            inputDecimals: TOKEN_LISTING_MAP.AUDIO.decimals,
            outputDecimals: LAUNCHPAD_COIN_DECIMALS
          })
        } else {
          setIsModalOpen(false)
          toast(messages.errors.unknownError, Infinity, {
            rightIcon: IconClose
          })
          reportToSentry({
            error: new Error(
              'First buy retry failed. No mint address or pay amount found.'
            ),
            name: 'First Buy Retry Failure',
            feature: Feature.ArtistCoins,
            additionalInfo: {
              errorMetadata,
              formValues
            }
          })
        }
      } else {
        trackCoinCreationStarted(connectedWalletAddress, formValues)
        const socialLinks = getArtistSocialLinks(currentUser)
        launchCoin({
          userId: currentUser.user_id,
          name: formValues.coinName,
          symbol: formValues.coinSymbol,
          image: formValues.coinImage!,
          description: LAUNCHPAD_COIN_DESCRIPTION(
            currentUser.handle,
            formValues.coinSymbol
          ),
          walletPublicKey: connectedWalletAddress,
          initialBuyAmountAudio,
          socialLinks
        })
      }
    },
    [
      connectedWalletAddress,
      currentUser,
      isFirstBuyError,
      toast,
      launchCoinResponse,
      errorMetadata,
      trackFirstBuyRetry,
      swapTokens,
      trackCoinCreationStarted,
      launchCoin
    ]
  )

  // Redirect if user is not verified or already has an artist coin
  if (hasExistingArtistCoin && isLaunchpadVerificationEnabled) {
    track(make({ eventName: Name.LAUNCHPAD_HAS_EXISTING_ARTIST_COIN }))
    return <Navigate to={route.COINS_EXPLORE_PAGE} replace />
  }

  return (
    <Formik<LaunchpadFormValues>
      initialValues={{
        coinName: '',
        coinSymbol: '',
        coinImage: null as File | null,
        payAmount: '',
        receiveAmount: '',
        usdcValue: '',
        wantsToBuy: 'no',
        termsAgreed: false
      }}
      validationSchema={validationSchema}
      validateOnMount={true}
      validateOnChange={true}
      validateOnBlur={true}
      onSubmit={handleSubmit}
    >
      <Form>
        <LaunchpadSubmitModal
          isPending={isPending}
          isError={isError}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          mintAddress={launchCoinResponse?.newMint}
          errorMetadata={errorMetadata}
        />
        <LaunchpadPageContent
          submitErrorText={
            isPoolCreateError
              ? messages.errors.coinCreationFailed
              : isSwapRetryError || isFirstBuyError
                ? messages.errors.firstBuyFailed
                : undefined
          }
          submitButtonText={isFirstBuyError ? 'Continue' : undefined}
        />
      </Form>
    </Formik>
  )
}
