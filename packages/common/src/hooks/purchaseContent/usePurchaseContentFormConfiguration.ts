import { useCallback, useEffect, useMemo } from 'react'

import { USDC, UsdcWei } from '@audius/fixed-decimal'
import { useQueryClient } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
import { z } from 'zod'

import { useCurrentAccount, useCurrentAccountUser, useUSDCBalance } from '~/api'
import { useQueryContext } from '~/api/tan-query/utils/QueryContext'
import { UserCollectionMetadata } from '~/models'
import { PurchaseMethod, PurchaseVendor } from '~/models/PurchaseContent'
import { UserTrackMetadata } from '~/models/Track'
import {
  PurchaseableContentType,
  PurchaseContentPage,
  isContentPurchaseInProgress,
  purchaseContentActions,
  purchaseContentSelectors
} from '~/store/purchase-content'
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

const USDC_TOKEN_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

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
    [PURCHASE_METHOD_MINT_ADDRESS]: USDC_TOKEN_ADDRESS
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
    [isUnlocking, contentId, page, dispatch, presetValues, isAlbum]
  )

  return {
    initialValues,
    validationSchema,
    onSubmit
  }
}
