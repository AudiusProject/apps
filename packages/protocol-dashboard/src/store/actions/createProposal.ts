import { useState, useCallback, useEffect } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import Audius from 'services/Audius'
import { fetchActiveProposals } from 'store/cache/proposals/hooks'
import { AppState } from 'store/types'
import { Status } from 'types'

function createAudiusProposal(
  targetContractName: string,
  signature: string,
  callData: any[],
  name: string,
  description: string,
  setStatus: (status: Status) => void,
  setError: (msg: string) => void
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)
    try {
      const proposal = {
        targetContractName,
        functionSignature: signature,
        callData,
        name,
        description
      }
      await aud.Governance.submitProposal(proposal)

      await dispatch(fetchActiveProposals())

      setStatus(Status.Success)
    } catch (err) {
      setStatus(Status.Failure)
      setError(err.message)
    }
  }
}

export const useCreateProposal = (shouldReset?: boolean) => {
  const [status, setStatus] = useState<undefined | Status>()
  const [error, setError] = useState<string>('')
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()

  useEffect(() => {
    if (shouldReset) {
      setStatus(undefined)
      setError('')
    }
  }, [shouldReset, setStatus, setError])

  useEffect(() => {
    if (status === Status.Success) {
    }
  }, [status])

  const createProposal = useCallback(
    (
      targetContractName: string,
      signature: string,
      callData: any[],
      name: string,
      description: string
    ) => {
      dispatch(
        createAudiusProposal(
          targetContractName,
          signature,
          callData,
          name,
          description,
          setStatus,
          setError
        )
      )
    },
    [dispatch, setStatus, setError]
  )

  return { status, error, createProposal }
}
