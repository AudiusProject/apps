import { useState, useCallback, useEffect } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import Audius from 'services/Audius'
import { fetchProposal } from 'store/cache/proposals/hooks'
import { fetchVotes } from 'store/cache/votes/hooks'
import { AppState } from 'store/types'
import { Status, Vote } from 'types'

function submitAudiusVote(
  proposalId: number,
  vote: Vote,
  currentVote: Vote,
  setStatus: (status: Status) => void,
  setError: (msg: string) => void
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    setStatus(Status.Loading)
    try {
      if (currentVote) {
        await aud.Governance.updateVote({ proposalId, vote })
      } else {
        await aud.Governance.submitVote({ proposalId, vote })
      }

      await dispatch(fetchVotes(proposalId))
      await dispatch(fetchProposal(proposalId))

      setStatus(Status.Success)
    } catch (err) {
      setStatus(Status.Failure)
      setError(err.message)
    }
  }
}

export const useSubmitVote = (shouldReset?: boolean) => {
  const [status, setStatus] = useState<undefined | Status>()
  const [error, setError] = useState<string>('')
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()

  useEffect(() => {
    if (shouldReset) {
      setStatus(undefined)
      setError('')
    }
  }, [shouldReset, setStatus, setError])

  const submitVote = useCallback(
    (proposalId: number, vote: Vote, currentVote: Vote) => {
      dispatch(
        submitAudiusVote(proposalId, vote, currentVote, setStatus, setError)
      )
    },
    [dispatch, setStatus, setError]
  )

  return { status, error, submitVote }
}
