import { useCallback, useContext, useEffect, useState } from 'react'

import {
  ConnectedWallet,
  getExternalWalletBalanceOptions,
  useCurrentAccountUser,
  useQueryContext,
  useArtistCreatedFanClub
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { launchpadMessages } from '@audius/common/messages'
import {
  Chain,
  Name,
  LaunchpadFormValues,
  WidthSizes
} from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { TOKEN_LISTING_MAP, useCoinSuccessModal } from '@audius/common/store'
import {
  getUserSocialLinks,
  route,
  shortenSPLAddress
} from '@audius/common/utils'
import { wAUDIO } from '@audius/fixed-decimal'
import { Flex, IconFanClub, IconCheck, IconClose, Text } from '@audius/harmony'
import { solana } from '@reown/appkit/networks'
import { useAppKitAccount as useExternalWalletAccount } from '@reown/appkit/react'
import { useQueryClient } from '@tanstack/react-query'
import { Form, Formik, useFormikContext } from 'formik'
import { Navigate, useNavigate } from 'react-router'

import { appkitModal } from 'app/ReownAppKitModal'
import { Header } from 'components/header/desktop/Header'
import { useMobileHeader } from 'components/header/mobile/hooks'
import Page from 'components/page/Page'
import { ToastContext } from 'components/toast/ToastContext'
import { AlreadyAssociatedError } from 'hooks/useConnectAndAssociateWallets'
import { useConnectExternalWallets } from 'hooks/useConnectExternalWallets'
import { useCoverPhoto } from 'hooks/useCoverPhoto'
import { useExternalWalletSwap } from 'hooks/useExternalWalletSwap'
import { LAUNCHPAD_COIN_DECIMALS, useLaunchCoin } from 'hooks/useLaunchCoin'
import { make, track } from 'services/analytics'

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
  errors: {
    coinCreationFailed: 'Fan club creation failed. Please try again.',
    firstBuyFailed: 'Purchase failed. Please try again.',
    firstBuyFailedToast:
      'Fan club created! Your purchase failed, please try again.',
    unknownError:
      'An unknown error occurred. The Audius team has been notified.',
    noSolanaWalletFound: 'No Solana wallet found',
    failedToCheckWalletBalance:
      'Failed to check wallet balance. Please try again.'
  }
}

const fetchImageAsFile = async (imageUrl: string): Promise<File | null> => {
  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(5000)
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }
    const blob = await response.blob()
    const urlParts = imageUrl.split('/')
    const filename = urlParts[urlParts.length - 1] || 'banner-image.jpg'
    const contentType = blob.type || 'image/jpeg'
    return new File([blob], filename, { type: contentType })
  } catch (error) {
    console.error('Error fetching image:', error)
    return null
  }
}

const LaunchpadPageContent = ({
  submitErrorText,
  submitButtonText,
  isVerified,
  isLaunchpadVerificationEnabled
}: {
  submitErrorText?: string
  submitButtonText?: string
  isVerified: boolean
  isLaunchpadVerificationEnabled: boolean
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

  useMobileHeader({
    title: launchpadMessages.page.title
  })

  const header = (
    <Header
      primary={launchpadMessages.page.title}
      icon={IconFanClub}
      rightDecorator={
        connectedWallet && phase !== Phase.SPLASH ? (
          <ConnectedWalletHeader connectedWalletAddress={connectedWallet} />
        ) : null
      }
    />
  )

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

  const handleWalletConnectSuccess = useCallback(
    async (newWallets: {
      solana: string | undefined
      eth: string | undefined
    }) => {
      const { solana: connectedWallet } = newWallets
      if (!connectedWallet) {
        alert(messages.errors.noSolanaWalletFound)
        console.error(
          'Launchpad Page',
          new Error(messages.errors.noSolanaWalletFound)
        )
        return
      }

      const walletBalanceData = await queryClient.fetchQuery({
        ...getExternalWalletBalanceOptions(queryContext, {
          walletAddress: connectedWallet,
          mint: TOKEN_LISTING_MAP.SOL.address
        }),
        staleTime: 0
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
        console.error(
          'Launchpad Page',
          error instanceof Error ? error : new Error(error as string)
        )
      }
    },
    [
      queryClient,
      queryContext,
      trackWalletConnectSuccess,
      trackWalletInsufficientBalance,
      handleWalletAddSuccess
    ]
  )

  const handleWalletConnectError = useCallback(
    async (error: unknown) => {
      if (error instanceof AlreadyAssociatedError) {
        const lastConnectedWallet = externalWalletAccount?.address
        if (lastConnectedWallet) {
          const walletBalanceData = await queryClient.fetchQuery({
            ...getExternalWalletBalanceOptions(queryContext, {
              walletAddress: lastConnectedWallet,
              mint: TOKEN_LISTING_MAP.SOL.address
            }),
            staleTime: 0
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
            isVerified={isVerified}
            isLaunchpadVerificationEnabled={isLaunchpadVerificationEnabled}
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
            isVerified={isVerified}
            isLaunchpadVerificationEnabled={isLaunchpadVerificationEnabled}
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
        contentClassName='fan-clubs-launchpad-page'
      >
        {renderCurrentPage()}
      </Page>
    </>
  )
}

export const LaunchpadPage = () => {
  const { data: currentUser } = useCurrentAccountUser()

  const { data: createdCoin } = useArtistCreatedFanClub(currentUser?.user_id)
  const { isEnabled: isLaunchpadVerificationEnabled } = useFeatureFlag(
    FeatureFlags.LAUNCHPAD_VERIFICATION
  )
  const hasExistingFanClub = !!createdCoin

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

  const {
    mutate: launchCoin,
    isPending: isLaunchCoinPending,
    isSuccess: isLaunchCoinFinished,
    data: launchCoinResponse,
    isError: uncaughtLaunchCoinError
  } = useLaunchCoin()

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

  const {
    mutate: swapTokens,
    isPending: isSwapRetryPending,
    isSuccess: isSwapRetryFinished,
    data: swapData
  } = useExternalWalletSwap()

  const isSwapRetryError = swapData?.error !== undefined
  const isSwapRetrySuccess = isSwapRetryFinished && !isSwapRetryError

  const { image: defaultBannerImageUrl } = useCoverPhoto({
    userId: currentUser?.user_id,
    size: WidthSizes.SIZE_2000
  })

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

  useEffect(() => {
    if (isPoolCreateError) {
      setIsModalOpen(false)
    }
  }, [isPoolCreateError])

  useEffect(() => {
    if (isSuccess && launchCoinResponse && formValues) {
      trackCoinCreationSuccess(launchCoinResponse, formValues)
      toast(
        <Flex gap='xs'>
          <IconCheck size='m' color='white' />
          <Text>{launchpadMessages.toast.coinCreated}</Text>
        </Flex>
      )

      navigate(route.coinPage(formValues.coinSymbol.toUpperCase()))

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

  useEffect(() => {
    if (isSwapRetryError) {
      setIsModalOpen(false)
    }
  }, [isSwapRetryError])

  useEffect(() => {
    if (isFirstBuyError) {
      setIsModalOpen(false)
      toast(messages.errors.firstBuyFailedToast, Infinity, {
        rightIcon: IconClose
      })
    }
  }, [isFirstBuyError, toast])

  useEffect(() => {
    if (isSwapRetryError) {
      toast(messages.errors.firstBuyFailed, Infinity, {
        rightIcon: IconClose
      })
    }
  }, [isSwapRetryError, toast])

  const handleSubmit = useCallback(
    async (formValues: LaunchpadFormValues) => {
      setFormValues(formValues)

      if (!currentUser || !connectedWalletAddress) {
        toast(messages.errors.unknownError, Infinity, {
          rightIcon: IconClose
        })
        console.error(
          'Launchpad Submit Error',
          new Error(
            'Unable to submit launchpad form. No user or connected wallet found'
          )
        )
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

      if (isFirstBuyError) {
        const mintAddress =
          launchCoinResponse.newMint || errorMetadata?.coinMetadata?.mint
        if (formValues.payAmount && mintAddress) {
          trackFirstBuyRetry(launchCoinResponse)
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
          console.error(
            'First Buy Retry Failure',
            new Error(
              'First buy retry failed. No mint address or pay amount found.'
            )
          )
        }
      } else {
        trackCoinCreationStarted(connectedWalletAddress, formValues)
        const socialLinks = getUserSocialLinks(currentUser)

        let bannerImageFile: File | null = null
        if (defaultBannerImageUrl) {
          try {
            bannerImageFile = await fetchImageAsFile(defaultBannerImageUrl)
            if (!bannerImageFile) {
              console.warn(
                'Failed to copy banner image, coin will be created without banner'
              )
              console.error(
                'Failed to Copy Banner Image',
                new Error('Failed to copy banner image from cover photo')
              )
            }
          } catch (error) {
            console.warn('Error copying banner image:', error)
            console.error(
              'Error Copying Banner Image',
              error instanceof Error ? error : new Error(String(error))
            )
          }
        }

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
          socialLinks,
          bannerImageFile: bannerImageFile ?? undefined,
          bannerImageUrl: undefined
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
      launchCoin,
      defaultBannerImageUrl
    ]
  )

  if (hasExistingFanClub && isLaunchpadVerificationEnabled) {
    track(make({ eventName: Name.LAUNCHPAD_HAS_EXISTING_FAN_CLUB }))
    return <Navigate to={route.CLUBS_EXPLORE_PAGE} replace />
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
        setupConfirmation: false,
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
          isVerified={currentUser?.is_verified ?? false}
          isLaunchpadVerificationEnabled={isLaunchpadVerificationEnabled}
        />
      </Form>
    </Formik>
  )
}
