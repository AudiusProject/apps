import { useState, useCallback, useEffect } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import BN from 'bn.js'
import { useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import Audius from 'services/Audius'
import { getAccountWallet } from 'store/account/hooks'
import { fetchUser } from 'store/cache/user/hooks'
import { AppState } from 'store/types'
import { Status } from 'types'

function updateMinimumDelegationAmount(
  amount: BN,
  setStatus: (status: Status) => void,
  setError: (msg: string) => void
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)
    try {
      const state = getState()
      const wallet = getAccountWallet(state)
      if (!wallet) {
        throw new Error(
          'No account wallet present, unable to update service provider minimum delegation amount'
        )
      }

      await aud.Delegate.updateSPMinDelegationAmount(wallet, amount)

      await dispatch(fetchUser(wallet))

      setStatus(Status.Success)
    } catch (err) {
      setStatus(Status.Failure)
      setError(err.message)
    }
  }
}

export const useUpdateMinimumDelegationAmount = (shouldReset?: boolean) => {
  const [status, setStatus] = useState<undefined | Status>()
  const [error, setError] = useState<string>('')
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (shouldReset) {
      setStatus(undefined)
      setError('')
    }
  }, [shouldReset, setStatus, setError])

  const updateMinimum = useCallback(
    (amount: BN) => {
      if (status !== Status.Loading) {
        dispatch(updateMinimumDelegationAmount(amount, setStatus, setError))
      }
    },
    [dispatch, status, setStatus, setError]
  )
  return { status, error, updateMinimum }
}
