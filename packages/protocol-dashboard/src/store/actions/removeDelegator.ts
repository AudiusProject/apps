import { useState, useCallback, useEffect } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import Audius from 'services/Audius'
import { getAccountWallet, fetchPendingTransactions } from 'store/account/hooks'
import { AppState } from 'store/types'
import { Status, Address } from 'types'

function removeAudiusDelegator(
  serviceProvider: Address,
  delegator: Address,
  setStatus: (status: Status) => void,
  setError: (msg: string) => void
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)
    try {
      await aud.Delegate.requestRemoveDelegator(serviceProvider, delegator)

      const state = getState()
      const wallet = getAccountWallet(state)
      if (wallet === serviceProvider)
        await dispatch(fetchPendingTransactions(wallet))

      setStatus(Status.Success)
    } catch (err) {
      setStatus(Status.Failure)
      setError(err.message)
    }
  }
}

export const useRemoveDelegator = (shouldReset: boolean) => {
  const [status, setStatus] = useState<undefined | Status>()
  const [error, setError] = useState<string>('')
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (shouldReset) {
      setStatus(undefined)
      setError('')
    }
  }, [shouldReset, setStatus, setError])

  const removeDelegator = useCallback(
    (serviceProvider: Address, delegator: Address) => {
      if (status !== Status.Loading) {
        dispatch(
          removeAudiusDelegator(serviceProvider, delegator, setStatus, setError)
        )
      }
    },
    [dispatch, setStatus, setError, status]
  )
  return { status, error, removeDelegator }
}
