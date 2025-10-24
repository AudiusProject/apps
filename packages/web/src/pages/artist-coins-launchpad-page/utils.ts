import { useCallback, useMemo } from 'react'

import { useAnalytics } from '@audius/common/hooks'
import { Name, LaunchCoinResponse } from '@audius/common/models'
import type { LaunchpadFormValues } from '@audius/common/models'
import { useFormikContext } from 'formik'
import { omit } from 'lodash'

import { make } from 'services/analytics'

export const useLaunchpadAnalytics = (params?: {
  externalWalletAddress?: string
}) => {
  const { externalWalletAddress } = params ?? {}
  const { track } = useAnalytics()
  const { values: formValues, errors } =
    useFormikContext<LaunchpadFormValues>() ?? {}
  const formValuesForAnalytics = useMemo(() => {
    return {
      ...omit(formValues, 'coinImage'), // dont want to upload the entire blob
      hasImage: !!formValues?.coinImage,
      formErrors: errors,
      externalWalletAddress
    }
  }, [formValues, errors, externalWalletAddress])

  // Splash page events
  const trackSplashGetStarted = useCallback(() => {
    track(
      make({
        eventName: Name.LAUNCHPAD_SPLASH_GET_STARTED
      })
    )
  }, [track])

  const trackSplashLearnMoreClicked = useCallback(() => {
    track(
      make({
        eventName: Name.LAUNCHPAD_SPLASH_LEARN_MORE_CLICKED
      })
    )
  }, [track])

  // Wallet connection events
  const trackWalletConnectSuccess = useCallback(
    (walletAddress: string, walletBalance: number) => {
      track(
        make({
          eventName: Name.LAUNCHPAD_WALLET_CONNECT_SUCCESS,
          walletAddress,
          walletSolBalance: walletBalance
        })
      )
    },
    [track]
  )

  const trackWalletConnectError = useCallback(
    (error: any) => {
      track(
        make({
          eventName: Name.LAUNCHPAD_WALLET_CONNECT_ERROR,
          error
        })
      )
    },
    [track]
  )

  const trackWalletInsufficientBalance = useCallback(
    (walletAddress: string, walletBalance: number) => {
      track(
        make({
          eventName: Name.LAUNCHPAD_WALLET_INSUFFICIENT_BALANCE,
          walletAddress,
          walletSolBalance: walletBalance
        })
      )
    },
    [track]
  )

  // Form progression events
  const trackFormInputChange = useCallback(
    (input: keyof LaunchpadFormValues, newValue: string) => {
      track(
        make({
          eventName: Name.LAUNCHPAD_FORM_INPUT_CHANGE,
          ...formValuesForAnalytics,
          input: input as string,
          newValue
        })
      )
    },
    [track, formValuesForAnalytics]
  )

  const trackFirstBuyQuoteReceived = useCallback(
    ({
      payAmount,
      receiveAmount,
      usdcValue
    }: {
      payAmount: string
      receiveAmount: string
      usdcValue: string
    }) => {
      track(
        make({
          eventName: Name.LAUNCHPAD_FIRST_BUY_QUOTE_RECEIVED,
          ...formValuesForAnalytics,
          payAmount,
          receiveAmount,
          usdcValue
        })
      )
    },
    [track, formValuesForAnalytics]
  )

  const trackSetupContinue = useCallback(() => {
    track(
      make({
        eventName: Name.LAUNCHPAD_SETUP_CONTINUE,
        ...formValuesForAnalytics
      })
    )
  }, [track, formValuesForAnalytics])

  const trackFormBack = useCallback(() => {
    track(
      make({
        eventName: Name.LAUNCHPAD_FORM_BACK,
        ...formValuesForAnalytics
      })
    )
  }, [track, formValuesForAnalytics])

  const trackReviewContinue = useCallback(() => {
    track(
      make({
        eventName: Name.LAUNCHPAD_REVIEW_CONTINUE,
        ...formValuesForAnalytics
      })
    )
  }, [formValuesForAnalytics, track])

  // Coin creation events
  const trackCoinCreationStarted = useCallback(
    (walletAddress: string, formValues: LaunchpadFormValues) => {
      track(
        make({
          eventName: Name.LAUNCHPAD_COIN_CREATION_STARTED,
          ...formValues,
          walletAddress
        })
      )
    },
    [track]
  )

  const trackCoinCreationSuccess = useCallback(
    (
      launchCoinResponse: LaunchCoinResponse,
      formValues: LaunchpadFormValues
    ) => {
      track(
        make({
          eventName: Name.LAUNCHPAD_COIN_CREATION_SUCCESS,
          ...formValues,
          launchCoinResponse
        })
      )
    },
    [track]
  )

  const trackCoinCreationFailure = useCallback(
    (
      launchCoinResponse: LaunchCoinResponse,
      errorState:
        | 'poolCreateFailed'
        | 'sdkCoinFailed'
        | 'firstBuyFailed'
        | 'unknownError'
    ) => {
      track(
        make({
          eventName: Name.LAUNCHPAD_COIN_CREATION_FAILURE,
          errorState,
          launchCoinResponse
        })
      )
    },
    [track]
  )

  const trackFirstBuyRetry = useCallback(
    (launchCoinResponse: LaunchCoinResponse) => {
      track(
        make({
          eventName: Name.LAUNCHPAD_FIRST_BUY_RETRY,
          ...formValuesForAnalytics,
          launchCoinResponse
        })
      )
    },
    [track, formValuesForAnalytics]
  )

  const trackBuyModalOpen = useCallback(() => {
    track(
      make({
        eventName: Name.LAUNCHPAD_BUY_MODAL_OPEN
      })
    )
  }, [track])

  const trackBuyModalClose = useCallback(() => {
    track(
      make({
        eventName: Name.LAUNCHPAD_BUY_MODAL_CLOSE
      })
    )
  }, [track])

  const trackFirstBuyMaxButton = useCallback(
    (maxValue: string) => {
      track(
        make({
          eventName: Name.LAUNCHPAD_FIRST_BUY_MAX_BUTTON,
          ...formValuesForAnalytics,
          maxValue
        })
      )
    },
    [track, formValuesForAnalytics]
  )

  return {
    // Splash page
    trackSplashGetStarted,
    trackSplashLearnMoreClicked,
    // Wallet connection events
    trackWalletConnectSuccess,
    trackWalletConnectError,
    trackWalletInsufficientBalance,
    // Page progression events
    trackSetupContinue,
    trackFormInputChange,
    trackFormBack,
    trackReviewContinue,
    // Coin creation flow
    trackCoinCreationStarted,
    trackCoinCreationSuccess,
    trackCoinCreationFailure,
    // First buy flow
    trackFirstBuyRetry,
    trackFirstBuyMaxButton,
    trackBuyModalOpen,
    trackBuyModalClose,
    trackFirstBuyQuoteReceived
  }
}
