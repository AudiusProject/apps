import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { Status } from '~/models/Status'

import { CoinflowWithdrawState, WithdrawMethod } from './types'

type WithdrawUSDCState = {
  withdrawStatus: Status
  coinflowState: CoinflowWithdrawState
  destinationAddress?: string
  amount?: number
  method: WithdrawMethod
  withdrawError?: Error
  withdrawTransaction?: string
  destinationError?: Error
  amountError?: Error
  lastCompletedTransactionSignature?: string
}

const initialState: WithdrawUSDCState = {
  withdrawStatus: Status.IDLE,
  method: WithdrawMethod.MANUAL_TRANSFER,
  coinflowState: CoinflowWithdrawState.IDLE
}

const slice = createSlice({
  name: 'withdraw-usdc',
  initialState,
  reducers: {
    beginWithdrawUSDC: (
      state,
      _action: PayloadAction<{
        currentBalance: number
        method: WithdrawMethod
        amount: number
        destinationAddress: string
      }>
    ) => {
      state.withdrawStatus = Status.LOADING
    },
    beginCoinflowWithdrawal: (state) => {
      state.coinflowState = CoinflowWithdrawState.FUNDING_ROOT_WALLET
    },
    coinflowWithdrawalReady: (state) => {
      state.coinflowState = CoinflowWithdrawState.READY_FOR_WITHDRAWAL
    },
    coinflowWithdrawalSucceeded: (
      state,
      _action: PayloadAction<{ transaction: string }>
    ) => {
      state.coinflowState = CoinflowWithdrawState.SUCCESS
    },
    coinflowWithdrawalCanceled: (state) => {
      state.coinflowState = CoinflowWithdrawState.CANCELED
    },
    withdrawUSDCSucceeded: (
      state,
      action: PayloadAction<{ transaction?: string }>
    ) => {
      state.withdrawTransaction = action.payload.transaction
      state.withdrawError = undefined
      state.withdrawStatus = Status.SUCCESS
      state.lastCompletedTransactionSignature = action.payload.transaction
    },
    withdrawUSDCFailed: (state, action: PayloadAction<{ error: Error }>) => {
      state.withdrawStatus = Status.ERROR
      state.withdrawError = action.payload.error
    },
    updateAmount: (state, action: PayloadAction<{ amount: number }>) => {
      state.amount = action.payload.amount
    },
    cleanup: () => initialState
  }
})

export const {
  beginWithdrawUSDC,
  beginCoinflowWithdrawal,
  coinflowWithdrawalReady,
  coinflowWithdrawalSucceeded,
  coinflowWithdrawalCanceled,
  withdrawUSDCSucceeded,
  withdrawUSDCFailed,
  updateAmount,
  cleanup
} = slice.actions

export default slice.reducer
export const actions = slice.actions
