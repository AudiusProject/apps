import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import {
  StripeModalState,
  StripeDestinationCurrencyType,
  StripeSessionData
} from './types'

type InitializeStripeModalPayload = {
  amount: string
  destinationCurrency: StripeDestinationCurrencyType
  destinationWallet: string
  onrampFailed: StripeModalState['onrampFailed']
  onrampSucceeded: StripeModalState['onrampSucceeded']
  onrampCanceled: StripeModalState['onrampCanceled']
  portalHostName?: string
}

const initialState: StripeModalState = {}

const slice = createSlice({
  name: 'ui/stripe-modal',
  initialState,
  reducers: {
    initializeStripeModal: (
      state,
      action: PayloadAction<InitializeStripeModalPayload>
    ) => {
      state.stripeSessionStatus = 'initialized'
      state.stripeSessionData = undefined
      state.previousStripeSessionData = undefined
      state.onrampFailed = action.payload.onrampFailed
      state.onrampSucceeded = action.payload.onrampSucceeded
      state.onrampCanceled = action.payload.onrampCanceled
      state.portalHostName = action.payload.portalHostName
    },
    stripeSessionCreated: (
      state,
      action: PayloadAction<{ clientSecret: string }>
    ) => {
      state.stripeClientSecret = action.payload.clientSecret
    },
    // Handled by saga
    cancelStripeOnramp: () => {},
    stripeSessionStatusChanged: (
      state,
      action: PayloadAction<{ session: StripeSessionData }>
    ) => {
      state.previousStripeSessionData = state.stripeSessionData
      state.stripeSessionData = action.payload.session
      state.stripeSessionStatus = action.payload.session.status
    }
  }
})

export const {
  initializeStripeModal,
  stripeSessionCreated,
  cancelStripeOnramp,
  stripeSessionStatusChanged
} = slice.actions

export default slice.reducer
export const actions = slice.actions
