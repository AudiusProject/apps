import { useQuery } from '@apollo/client'
import { AnyAction } from '@reduxjs/toolkit'
import { useSelector, useDispatch } from 'react-redux'
import { ThunkDispatch } from 'redux-thunk'

import Audius from 'services/Audius'
import { AppState } from 'store/types'

import { setDidError } from './slice'

export const getGraphAPI = (state: AppState) => state.api
export const getDidGraphError = (state: AppState) => state.api.didError

export const useGraphQuery: typeof useQuery = (...args) => {
  const result = useQuery(...args)
  const didError = useSelector(getDidGraphError)
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()

  if (!result.loading && !didError && result.error) {
    dispatch(setDidError())
  }

  return result
}
