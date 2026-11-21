import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { isNullOrUndefined, Nullable } from '~/utils/typeUtils'

import { StringUSDC, StringWei } from '../../models/Wallet'

type WalletState = {
  balance: Nullable<StringWei>
  balanceLoading: boolean
  balanceLoadDidFail: Nullable<boolean>
  totalBalance: Nullable<StringWei>
  totalBalanceLoadDidFail: Nullable<boolean>
  localBalanceDidChange: boolean
  freezeBalanceUntil: Nullable<number>
  usdcBalance: Nullable<StringUSDC>
}

const initialState: WalletState = {
  balance: null,
  balanceLoading: true,
  balanceLoadDidFail: false,
  totalBalance: null,
  totalBalanceLoadDidFail: false,
  localBalanceDidChange: false,
  freezeBalanceUntil: null,
  usdcBalance: null
}

const slice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setBalance: (
      state,
      {
        payload: { balance, totalBalance }
      }: PayloadAction<{ balance: StringWei; totalBalance?: StringWei }>
    ) => {
      state.balance = balance
      state.balanceLoading = false
      state.balanceLoadDidFail = false
      if (!isNullOrUndefined(totalBalance)) {
        state.totalBalance = totalBalance
        state.totalBalanceLoadDidFail = false
      }
      state.localBalanceDidChange = false
    },
    setBalanceError: (
      state,
      {
        payload: { balanceLoadDidFail, totalBalanceLoadDidFail }
      }: PayloadAction<{
        balanceLoadDidFail?: boolean
        totalBalanceLoadDidFail?: boolean
      }>
    ) => {
      if (balanceLoadDidFail != null) {
        state.balanceLoadDidFail = balanceLoadDidFail
      }
      if (totalBalanceLoadDidFail != null) {
        state.totalBalanceLoadDidFail = totalBalanceLoadDidFail
      }
    },
    setUSDCBalance: (
      state,
      { payload: { amount } }: PayloadAction<{ amount: StringUSDC }>
    ) => {
      state.usdcBalance = amount
    },
    claim: () => {},
    claimSucceeded: () => {},
    claimFailed: (_state, _action: PayloadAction<{ error?: string }>) => {},
    send: (
      _state,
      _action: PayloadAction<{
        recipientWallet: string
        amount: StringWei
      }>
    ) => {},
    sendSucceeded: () => {},
    sendFailed: (_state, _action: PayloadAction<{ error?: string }>) => {}
  }
})

export const {
  setUSDCBalance,
  claim,
  claimSucceeded,
  claimFailed,
  send,
  sendSucceeded,
  sendFailed
} = slice.actions
export default slice.reducer
export const actions = slice.actions
