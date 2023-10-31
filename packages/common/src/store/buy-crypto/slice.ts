import { MintName } from '@audius/sdk'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { OnRampProvider } from 'store/ui/buy-audio/types'

import { BuyCryptoError } from './types'

type BuyCryptoPayload = {
  /**
   * The amount the user is requesting, in user friendly decimal denomination
   */
  amount: number
  /**
   * The mint name of the token the user wants to purchase
   */
  mint: MintName
  /**
   * The service used to purchase the SOL necessary
   */
  provider: OnRampProvider
}

type BuyCryptoState = {}

const initialState: BuyCryptoState = {}

const slice = createSlice({
  name: 'buy-crypto',
  initialState,
  reducers: {
    buyCryptoViaSol: (_state, _action: PayloadAction<BuyCryptoPayload>) => {
      // Triggers saga
    },
    /**
     * @internal used for tracking onramp state in saga
     */
    onrampSucceeded: () => {
      // handled by saga
    },
    /**
     * @internal used for tracking onramp state in saga
     */
    onrampCanceled: () => {
      // handled by saga
    },
    /**
     * @internal used for tracking onramp state in saga
     */
    onrampFailed: (_state, _action: PayloadAction<{ error: Error }>) => {
      // handled by saga
    },
    /**
     * Fired when the purchase was exited by the user
     */
    buyCryptoCanceled: () => {
      // handled by saga
    },
    /**
     * Fired when an error was thrown in the saga
     */
    buyCryptoFailed: (
      _state,
      _action: PayloadAction<{ error: BuyCryptoError }>
    ) => {
      // handled by saga
    },
    /**
     * Fired when the purchase succeeds
     */
    buyCryptoSucceeded: () => {
      // handled by saga
    }
  }
})

export const {
  buyCryptoViaSol,
  onrampSucceeded,
  onrampCanceled,
  onrampFailed,
  buyCryptoSucceeded,
  buyCryptoFailed,
  buyCryptoCanceled
} = slice.actions

export default slice.reducer
export const actions = slice.actions
