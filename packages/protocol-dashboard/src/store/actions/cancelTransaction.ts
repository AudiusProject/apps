import { useState, useCallback, useEffect } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import Audius from 'services/Audius'
import { fetchPendingTransactions } from 'store/account/hooks'
import { AppState } from 'store/types'
import { PendingTransactionName, Status, Address } from 'types'

function cancelDecreaseStake(
  setStatus: (status: Status) => void,
  setError: (error: string) => void
): ThunkAction<void, AppState, Audius, Action<void>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)
    try {
      const wallet = getState().account.wallet
      if (!wallet) throw new Error('Not signed in')
      await aud.ServiceProviderClient.cancelDecreaseStakeRequest(wallet)

      await dispatch(fetchPendingTransactions(wallet))

      setStatus(Status.Success)
    } catch (error) {
      setError(error.message)
      setStatus(Status.Failure)
    }
  }
}

function cancelUpdateOperatorCut(
  setStatus: (status: Status) => void,
  setError: (error: string) => void
): ThunkAction<void, AppState, Audius, Action<void>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)
    try {
      const wallet = getState().account.wallet
      if (!wallet) throw new Error('Not signed in')
      await aud.ServiceProviderClient.cancelUpdateDeployerCut(wallet)

      await dispatch(fetchPendingTransactions(wallet))

      setStatus(Status.Success)
    } catch (error) {
      setError(error.message)
      setStatus(Status.Failure)
    }
  }
}

function cancelUndelegate(
  setStatus: (status: Status) => void,
  setError: (error: string) => void
): ThunkAction<void, AppState, Audius, Action<void>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)
    try {
      const wallet = getState().account.wallet
      if (!wallet) throw new Error('Not signed in')
      await aud.Delegate.cancelUndelegateStakeRequest()
      await dispatch(fetchPendingTransactions(wallet))

      setStatus(Status.Success)
    } catch (error) {
      setError(error.message)
      setStatus(Status.Failure)
    }
  }
}

function cancelRemoveDelegator(
  wallet: Address,
  setStatus: (status: Status) => void,
  setError: (error: string) => void
): ThunkAction<void, AppState, Audius, Action<void>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)
    try {
      const accountWallet = getState().account.wallet
      if (!accountWallet) throw new Error('Not signed in')
      if (!wallet) throw new Error('Delegator wallet not provided')
      await aud.Delegate.cancelRemoveDelegatorRequest(accountWallet, wallet)

      await dispatch(fetchPendingTransactions(accountWallet))

      setStatus(Status.Success)
    } catch (error) {
      setError(error.message)
      setStatus(Status.Failure)
    }
  }
}

export const useCancelTransaction = (
  name: PendingTransactionName,
  shouldReset: boolean
) => {
  const [status, setStatus] = useState<undefined | Status>()
  const [error, setError] = useState<string>('')
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (shouldReset) {
      setStatus(undefined)
      setError('')
    }
  }, [shouldReset, setStatus, setError])

  const cancelTransaction = useCallback(
    (wallet?: Address) => {
      if (status !== Status.Loading) {
        switch (name) {
          case PendingTransactionName.DecreaseStake: {
            dispatch(cancelDecreaseStake(setStatus, setError))
            break
          }
          case PendingTransactionName.UpdateOperatorCut: {
            dispatch(cancelUpdateOperatorCut(setStatus, setError))
            break
          }
          case PendingTransactionName.Undelegate: {
            dispatch(cancelUndelegate(setStatus, setError))
            break
          }
          case PendingTransactionName.RemoveDelegator: {
            dispatch(cancelRemoveDelegator(wallet!, setStatus, setError))
            break
          }
        }
      }
    },
    [dispatch, name, status, setStatus, setError]
  )
  return { status, error, setError, setStatus, cancelTransaction }
}
