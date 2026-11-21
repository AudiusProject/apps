import { useState, useCallback, useEffect } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import Audius from 'services/Audius'
import { fetchPendingTransactions, getAccountWallet } from 'store/account/hooks'
import { fetchUser } from 'store/cache/user/hooks'
import { AppState } from 'store/types'
import { Status, BigNumber } from 'types'

function increaseAudiusStake(
  stakingAmount: BigNumber,
  setStatus: (status: Status) => void,
  setError: (msg: string) => void
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)
    try {
      await aud.ServiceProviderClient.increaseStake(stakingAmount)

      const state = getState()
      const wallet = getAccountWallet(state)
      if (wallet) await dispatch(fetchUser(wallet))

      setStatus(Status.Success)
    } catch (err) {
      setStatus(Status.Failure)
      setError(err.message)
    }
  }
}

function decreaseAudiusStake(
  stakingAmount: BigNumber,
  setStatus: (status: Status) => void,
  setError: (msg: string) => void
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)
    try {
      await aud.ServiceProviderClient.requestDecreaseStake(stakingAmount)

      const state = getState()
      const wallet = getAccountWallet(state)
      if (wallet) await dispatch(fetchPendingTransactions(wallet))

      setStatus(Status.Success)
    } catch (err) {
      setStatus(Status.Failure)
      setError(err.message)
    }
  }
}

export const useUpdateStake = (isIncrease: boolean, shouldReset?: boolean) => {
  const [status, setStatus] = useState<undefined | Status>()
  const [error, setError] = useState<string>('')
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (shouldReset) {
      setStatus(undefined)
      setError('')
    }
  }, [shouldReset, setStatus, setError])

  const updateStake = useCallback(
    (stakingAmount: BigNumber) => {
      if (status !== Status.Loading) {
        if (isIncrease) {
          dispatch(increaseAudiusStake(stakingAmount, setStatus, setError))
        } else {
          dispatch(decreaseAudiusStake(stakingAmount, setStatus, setError))
        }
      }
    },
    [isIncrease, dispatch, status, setStatus, setError]
  )
  return { status, error, updateStake }
}
