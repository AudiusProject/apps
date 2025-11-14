import { Action, createSlice, PayloadAction } from '@reduxjs/toolkit'

import { PurchaseVendor } from '~/models/PurchaseContent'
import { Status } from '~/models/Status'
import { StripeSessionCreationError } from '~/store/ui/stripe-modal/types'

import { BuyUSDCStage, PurchaseInfo, BuyUSDCError } from './types'

type StripeSessionStatus =
  | 'initialized'
  | 'rejected'
  | 'requires_payment'
  | 'fulfillment_processing'
  | 'fulfillment_complete'

type OnSuccess = {
  action?: Action
  message?: string
}

type BuyUSDCState = {
  stage: BuyUSDCStage
  error?: BuyUSDCError
  vendor?: PurchaseVendor
  onSuccess?: OnSuccess
  stripeSessionStatus?: StripeSessionStatus
  recoveryStatus: Status
}

const initialState: BuyUSDCState = {
  vendor: undefined,
  stage: BuyUSDCStage.START,
  recoveryStatus: Status.IDLE
}

const slice = createSlice({
  name: 'buy-usdc',
  initialState,
  reducers: {
    onrampOpened: (
      state,
      action: PayloadAction<{
        purchaseInfo: PurchaseInfo
        vendor: PurchaseVendor
        portalHostName?: string
      }>
    ) => {
      state.stage = BuyUSDCStage.START
      state.error = undefined
      state.vendor = action.payload.vendor
    },
    purchaseStarted: (state) => {
      state.stage = BuyUSDCStage.PURCHASING
    },
    onrampCanceled: (state) => {
      if (state.stage === BuyUSDCStage.PURCHASING) {
        state.stage = BuyUSDCStage.CANCELED
      }
    },
    onrampSucceeded: (state) => {
      state.stage = BuyUSDCStage.CONFIRMING_PURCHASE
    },
    onrampFailed: (
      _state,
      _action: PayloadAction<{ error?: StripeSessionCreationError }>
    ) => {
      // handled by saga
    },
    buyUSDCFlowFailed: (
      state,
      action: PayloadAction<{ error: BuyUSDCError }>
    ) => {
      state.error = action.payload.error
    },
    buyUSDCFlowSucceeded: (state) => {
      state.stage = BuyUSDCStage.FINISH
    },
    stripeSessionStatusChanged: (
      state,
      action: PayloadAction<{ status: StripeSessionStatus }>
    ) => {
      state.stripeSessionStatus = action.payload.status
    },
    startRecoveryIfNecessary: () => {
      // triggers sagas
    },
    recoveryStatusChanged: (
      state,
      action: PayloadAction<{ status: Status }>
    ) => {
      state.recoveryStatus = action.payload.status
    },
    cleanup: () => initialState
  }
})

export const {
  buyUSDCFlowFailed,
  buyUSDCFlowSucceeded,
  onrampOpened,
  purchaseStarted,
  onrampSucceeded,
  onrampCanceled,
  onrampFailed,
  stripeSessionStatusChanged,
  startRecoveryIfNecessary,
  recoveryStatusChanged,
  cleanup
} = slice.actions

export default slice.reducer
export const actions = slice.actions
