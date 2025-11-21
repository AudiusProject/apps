import { Action, createSlice, PayloadAction } from '@reduxjs/toolkit'

import { ID } from '~/models/Identifiers'
import { PurchaseMethod, PurchaseVendor } from '~/models/PurchaseContent'

import {
  PurchaseableContentType,
  PurchaseContentError,
  PurchaseContentPage,
  PurchaseContentStage
} from './types'

type OnSuccess = {
  action?: Action
  message?: string
}

type PurchaseContentState = {
  page: PurchaseContentPage
  stage: PurchaseContentStage
  contentType: PurchaseableContentType
  contentId: ID
  /** Pay extra amount in cents */
  extraAmount?: number
  /** Used for analytics */
  extraAmountPreset?: string
  error?: PurchaseContentError
  onSuccess?: OnSuccess
  purchaseMethod: PurchaseMethod
  purchaseVendor?: PurchaseVendor
  guestEmail?: string
  purchaseMethodMintAddress?: string
}

const initialState: PurchaseContentState = {
  page: PurchaseContentPage.PURCHASE,
  contentType: PurchaseableContentType.TRACK,
  contentId: -1,
  extraAmount: undefined,
  extraAmountPreset: undefined,
  error: undefined,
  stage: PurchaseContentStage.IDLE,
  purchaseMethod: PurchaseMethod.BALANCE,
  purchaseVendor: undefined,
  purchaseMethodMintAddress: undefined,
  guestEmail: undefined
}

const slice = createSlice({
  name: 'purchase-content',
  initialState,
  reducers: {
    startPurchaseContentFlow: (
      state,
      action: PayloadAction<{
        extraAmount?: number
        extraAmountPreset?: string
        purchaseMethod: PurchaseMethod
        purchaseVendor?: PurchaseVendor
        purchaseMethodMintAddress?: string
        contentId: ID
        contentType?: PurchaseableContentType
        onSuccess?: OnSuccess
        guestEmail?: string
      }>
    ) => {
      state.page = PurchaseContentPage.PURCHASE
      state.stage = PurchaseContentStage.START
      state.error = undefined
      state.extraAmount = action.payload.extraAmount
      state.extraAmountPreset = action.payload.extraAmountPreset
      state.contentId = action.payload.contentId
      state.contentType =
        action.payload.contentType ?? PurchaseableContentType.TRACK
      state.onSuccess = action.payload.onSuccess
      state.purchaseMethod = action.payload.purchaseMethod
      state.purchaseVendor = action.payload.purchaseVendor
      state.guestEmail = action.payload.guestEmail
      state.purchaseMethodMintAddress = action.payload.purchaseMethodMintAddress
    },
    startArtistCoinPurchaseFlow: (state) => {
      state.stage = PurchaseContentStage.START
    },
    artistCoinPurchaseFlowError: (
      state,
      action: PayloadAction<{ error: PurchaseContentError }>
    ) => {
      state.stage = PurchaseContentStage.IDLE
      state.error = action.payload.error
    },
    buyUSDC: (state) => {
      state.stage = PurchaseContentStage.BUY_USDC
    },
    usdcBalanceSufficient: (state) => {
      state.stage = PurchaseContentStage.PURCHASING
    },
    coinflowPurchaseSucceeded: (_state) => {},
    coinflowPurchaseFailed: (_state) => {},
    coinflowPurchaseCanceled: (_state) => {},
    purchaseCanceled: (state) => {
      state.stage = PurchaseContentStage.CANCELED
    },
    purchaseSucceeded: (state) => {
      state.stage = PurchaseContentStage.CONFIRMING_PURCHASE
    },
    purchaseConfirmed: (
      state,
      _action: PayloadAction<{
        contentType: PurchaseableContentType
        contentId: ID
      }>
    ) => {
      state.stage = PurchaseContentStage.FINISH
    },
    setPurchasePage: (
      state,
      action: PayloadAction<{ page: PurchaseContentPage }>
    ) => {
      state.page = action.payload.page
    },
    purchaseContentFlowFailed: (
      state,
      action: PayloadAction<{ error: PurchaseContentError }>
    ) => {
      state.error = action.payload.error
    },
    cleanup: () => initialState,
    eagerCreateUserBank: (_state) => {}
  }
})

export const {
  startPurchaseContentFlow,
  startArtistCoinPurchaseFlow,
  artistCoinPurchaseFlowError,
  buyUSDC,
  usdcBalanceSufficient,
  purchaseSucceeded,
  purchaseConfirmed,
  purchaseCanceled,
  purchaseContentFlowFailed,
  cleanup,
  eagerCreateUserBank
} = slice.actions

export default slice.reducer
export const actions = slice.actions
