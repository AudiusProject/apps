import { useState, useCallback, useEffect } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import Audius from 'services/Audius'
import { fetchPendingTransactions, getAccountWallet } from 'store/account/hooks'
import { fetchUser } from 'store/cache/user/hooks'
import { AppState } from 'store/types'
import { PendingTransactionName, Status, Address } from 'types'

function decreaseStake(
  setStatus: (status: Status) => void,
  setError: (error: string) => void
): ThunkAction<void, AppState, Audius, Action<void>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)
    try {
      await aud.ServiceProviderClient.decreaseStake()

      const state = getState()
      const wallet = getAccountWallet(state)
      if (wallet) await dispatch(fetchUser(wallet))
      if (wallet) await dispatch(fetchPendingTransactions(wallet))

      setStatus(Status.Success)
    } catch (error) {
      console.error(error)
      setError(error.message)
      setStatus(Status.Failure)
    }
  }
}

function updateOperatorCut(
  setStatus: (status: Status) => void,
  setError: (error: string) => void
): ThunkAction<void, AppState, Audius, Action<void>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)
    try {
      const wallet = getState().account.wallet
      if (!wallet) throw new Error('Not signed in')
      await aud.ServiceProviderClient.updateDeployerCut(wallet)

      await dispatch(fetchUser(wallet))
      await dispatch(fetchPendingTransactions(wallet))

      setStatus(Status.Success)
    } catch (error) {
      console.error(error)
      setError(error.message)
      setStatus(Status.Failure)
    }
  }
}

function undelegate(
  setStatus: (status: Status) => void,
  setError: (error: string) => void
): ThunkAction<void, AppState, Audius, Action<void>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)
    try {
      await aud.Delegate.undelegateStake()

      const state = getState()
      const wallet = getAccountWallet(state)
      if (wallet) await dispatch(fetchUser(wallet))
      if (wallet) await dispatch(fetchPendingTransactions(wallet))

      setStatus(Status.Success)
    } catch (error) {
      console.error(error)
      setError(error.message)
      setStatus(Status.Failure)
    }
  }
}

function removeDelegator(
  wallet: Address,
  setStatus: (status: Status) => void,
  setError: (error: string) => void
): ThunkAction<void, AppState, Audius, Action<void>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)
    try {
      const accountWallet = getState().account.wallet
      if (!accountWallet) throw new Error('Not signed in')
      if (!wallet) throw new Error('Delegator wallat not provided')
      await aud.Delegate.removeDelegator(accountWallet, wallet)

      await dispatch(fetchUser(wallet))
      await dispatch(fetchUser(accountWallet))
      await dispatch(fetchPendingTransactions(accountWallet))

      setStatus(Status.Success)
    } catch (error) {
      console.error(error)
      setError(error.message)
      setStatus(Status.Failure)
    }
  }
}

export const useSubmitTransaction = (
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

  const submitTransaction = useCallback(
    (wallet?: Address) => {
      if (status !== Status.Loading) {
        switch (name) {
          case PendingTransactionName.DecreaseStake: {
            dispatch(decreaseStake(setStatus, setError))
            break
          }
          case PendingTransactionName.UpdateOperatorCut: {
            dispatch(updateOperatorCut(setStatus, setError))
            break
          }
          case PendingTransactionName.Undelegate: {
            dispatch(undelegate(setStatus, setError))
            break
          }
          case PendingTransactionName.RemoveDelegator: {
            dispatch(removeDelegator(wallet!, setStatus, setError))
            break
          }
        }
      }
    },
    [dispatch, name, status, setStatus, setError]
  )
  return { status, error, submitTransaction }
}
