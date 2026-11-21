import { useState, useCallback, useEffect } from 'react'

import { useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction } from 'redux-thunk'

import Audius from 'services/Audius'
import { getAccountWallet, fetchPendingTransactions } from 'store/account/hooks'
import { AppState } from 'store/types'
import { Status } from 'types'

function updateAudiusOperatorCut(
  cut: number,
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
          'No account wallet present, unable to update deployer stake'
        )
      }
      await aud.ServiceProviderClient.requestUpdateDeployerCut(wallet, cut)

      await dispatch(fetchPendingTransactions(wallet))

      setStatus(Status.Success)
    } catch (err) {
      setStatus(Status.Failure)
      setError(err.message)
    }
  }
}

export const useUpdateOperatorCut = (shouldReset?: boolean) => {
  const [status, setStatus] = useState<undefined | Status>()
  const [error, setError] = useState<string>('')
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (shouldReset) {
      setStatus(undefined)
      setError('')
    }
  }, [shouldReset, setStatus, setError])

  const updateOperatorCut = useCallback(
    (cut: number) => {
      if (status !== Status.Loading) {
        dispatch(updateAudiusOperatorCut(cut, setStatus, setError))
      }
    },
    [dispatch, status, setStatus, setError]
  )
  return { status, error, updateOperatorCut }
}
