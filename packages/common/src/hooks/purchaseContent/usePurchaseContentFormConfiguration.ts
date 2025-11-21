import { useCallback, useEffect, useMemo } from 'react'

import { USDC, UsdcWei } from '@audius/fixed-decimal'
import { useQueryClient } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
import { z } from 'zod'

import {
  SLIPPAGE_BPS,
  SwapStatus,
  useCurrentAccount,
  useCurrentAccountUser,
  useSwapCoins,
  useUSDCBalance
} from '~/api'
import { useQueryContext } from '~/api/tan-query/utils/QueryContext'
import { UserCollectionMetadata } from '~/models'
import { PurchaseMethod, PurchaseVendor } from '~/models/PurchaseContent'
import { UserTrackMetadata } from '~/models/Track'
import {
  PurchaseableContentType,
  PurchaseContentPage,
  isContentPurchaseInProgress,
  purchaseContentActions,
  purchaseContentSelectors,
  PurchaseContentError,
  PurchaseErrorCode
} from '~/store/purchase-content'
import {
  artistCoinPurchaseFlowError,
  startArtistCoinPurchaseFlow
} from '~/store/purchase-content/slice'
import { AUDIO_MINT, USDC_MINT } from '~/store/ui/shared/tokenConstants'
import { isContentCollection, isContentTrack } from '~/utils'

import {
  AMOUNT_PRESET,
  CENTS_TO_USDC_MULTIPLIER,
  CUSTOM_AMOUNT,
  GUEST_CHECKOUT,
  GUEST_EMAIL,
  PURCHASE_METHOD,
  PURCHASE_METHOD_MINT_ADDRESS,
  PURCHASE_VENDOR
} from './constants'
import { PayExtraAmountPresetValues, PayExtraPreset } from './types'
import { getExtraAmount } from './utils'
import { createPurchaseContentSchema } from './validation'

const { startPurchaseContentFlow, setPurchasePage } = purchaseContentActions
const {
  getPurchaseContentFlowStage,
  getPurchaseContentError,
  getPurchaseContentPage
} = purchaseContentSelectors

export const usePurchaseContentFormConfiguration = ({
  metadata,
  price,
  presetValues,
  purchaseVendor
}: {
  metadata?: UserTrackMetadata | UserCollectionMetadata
  price: number
  presetValues: PayExtraAmountPresetValues
  purchaseVendor?: PurchaseVendor
}) => {
  const queryClient = useQueryClient()
  const queryContext = useQueryContext()

  const dispatch = useDispatch()
  const isAlbum = isContentCollection(metadata)
  const isTrack = isContentTrack(metadata)
  const stage = useSelector(getPurchaseContentFlowStage)
  const error = useSelector(getPurchaseContentError)
  const page = useSelector(getPurchaseContentPage)
  const isUnlocking = !error && isContentPurchaseInProgress(stage)
  const { data: balanceWei } = useUSDCBalance()
  const balance = USDC(balanceWei ?? (BigInt(0) as UsdcWei)).value
  const { data: guestEmail } = useCurrentAccount({
    select: (account) => account?.guestEmail
  })
  const { data: currentUser } = useCurrentAccountUser()
  const { mutate: performSwap } = useSwapCoins()

  const isGuestCheckout = !currentUser || (currentUser && !currentUser.handle)

  useEffect(() => {
    // check if feature flag loaded to set the page
    if (isGuestCheckout) {
      dispatch(setPurchasePage({ page: PurchaseContentPage.GUEST_CHECKOUT }))
    }
  }, [dispatch, isGuestCheckout])

  const initialValues: PurchaseContentValues = {
    [CUSTOM_AMOUNT]: undefined,
    [AMOUNT_PRESET]: PayExtraPreset.NONE,
    [PURCHASE_METHOD]:
      balance >= BigInt(price * CENTS_TO_USDC_MULTIPLIER)
        ? PurchaseMethod.BALANCE
        : PurchaseMethod.CARD,
    [PURCHASE_VENDOR]: purchaseVendor ?? PurchaseVendor.STRIPE,
    [GUEST_CHECKOUT]: isGuestCheckout,
    [GUEST_EMAIL]: guestEmail ?? undefined,
    [PURCHASE_METHOD_MINT_ADDRESS]: AUDIO_MINT
  }

  const contentId = isAlbum
    ? metadata?.playlist_id
    : isTrack
      ? metadata?.track_id
      : undefined

  const validationSchema = useMemo(
    () =>
      createPurchaseContentSchema(
        queryContext,
        queryClient,
        page,
        guestEmail ?? undefined
      ),
    [queryContext, queryClient, guestEmail, page]
  )
  type PurchaseContentValues = z.input<typeof validationSchema>

  const onSubmit = useCallback(
    ({
      customAmount,
      amountPreset,
      purchaseMethod,
      purchaseVendor,
      guestEmail,
      purchaseMethodMintAddress
    }: PurchaseContentValues) => {
      if (isUnlocking || !contentId) return

      if (
        purchaseMethod === PurchaseMethod.CRYPTO &&
        page === PurchaseContentPage.PURCHASE
      ) {
        dispatch(setPurchasePage({ page: PurchaseContentPage.TRANSFER }))
      } else if (
        page === PurchaseContentPage.GUEST_CHECKOUT &&
        guestEmail !== ''
      ) {
        dispatch(setPurchasePage({ page: PurchaseContentPage.PURCHASE }))
      } else if (purchaseMethod === PurchaseMethod.ARTIST_COIN) {
        // Swap token to USDC then purchase
        if (!purchaseMethodMintAddress) {
          throw new Error('Missing purchase method mint address')
        }
        const extraAmount = getExtraAmount({
          amountPreset,
          presetValues,
          customAmount
        })

        console.log({
          metadata,
          extraAmount,
          amountPreset,
          customAmount,
          presetValues,
          purchaseMethod,
          purchaseVendor,
          purchaseMethodMintAddress
        })

        // TODO: Uncomment this later when testing is finished
        // Need this to make the button say purchasing when the swap is in progress
        // dispatch(startArtistCoinPurchaseFlow())

        // TODO: Need to get the amount of artist coins to swap to USDC
        // Need to get the price of the content + the extra amount and then convert from USDC to artist coins
        // Need to convert the USDC required amount into the amount of artist coins to swap and then put that in amountUi field

        performSwap(
          {
            inputMint: purchaseMethodMintAddress,
            outputMint: USDC_MINT,
            // TODO: Get the correct amount to swap
            amountUi: 1,
            slippageBps: SLIPPAGE_BPS
          },
          {
            onSettled: (result) => {
              if (result?.status === SwapStatus.SUCCESS) {
                console.log('success swapping artist coin to USDC', { result })
                // Swap Successful, Purchase the content
                dispatch(
                  startPurchaseContentFlow({
                    purchaseMethod: PurchaseMethod.ARTIST_COIN,
                    purchaseVendor,
                    purchaseMethodMintAddress: USDC_MINT,
                    extraAmount,
                    extraAmountPreset: amountPreset,
                    contentId,
                    contentType: isAlbum
                      ? PurchaseableContentType.ALBUM
                      : PurchaseableContentType.TRACK,
                    guestEmail
                  })
                )
              } else {
                // Swap Failed, Handle error
                console.log('error', { result })
                dispatch(
                  artistCoinPurchaseFlowError({
                    error: new PurchaseContentError(
                      PurchaseErrorCode.SwapFailed,
                      'Error swapping artist coin to USDC'
                    )
                  })
                )
              }
            }
          }
        )
      } else {
        const extraAmount = getExtraAmount({
          amountPreset,
          presetValues,
          customAmount
        })
        dispatch(
          startPurchaseContentFlow({
            purchaseMethod,
            purchaseVendor,
            purchaseMethodMintAddress,
            extraAmount,
            extraAmountPreset: amountPreset,
            contentId,
            contentType: isAlbum
              ? PurchaseableContentType.ALBUM
              : PurchaseableContentType.TRACK,
            guestEmail
          })
        )
      }
    },
    [
      isUnlocking,
      contentId,
      page,
      dispatch,
      presetValues,
      metadata,
      performSwap,
      isAlbum
    ]
  )

  return {
    initialValues,
    validationSchema,
    onSubmit
  }
}
