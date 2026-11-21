import { useEffect } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import { useSelector, useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import Audius from 'services/Audius'
import {
  fetchClaim,
  setClaim,
  setClaimMetadata as setMetadata
} from 'store/cache/claims/slice'
import { AppState } from 'store/types'
import { Address, Status } from 'types'

export const getPendingClaim = (wallet: Address) => (state: AppState) =>
  state.cache.claims.users[wallet]

export const getFundsPerRound = () => (state: AppState) =>
  state.cache.claims.metadata.fundsPerRound

export const getLastFundedBlock = () => (state: AppState) =>
  state.cache.claims.metadata.lastFundedBlock

export const getClaimMetadata = () => (state: AppState) =>
  state.cache.claims.metadata

export function fetchPendingClaim(
  wallet: Address
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    await aud.awaitSetup()
    dispatch(fetchClaim({ wallet }))
    try {
      const hasClaim = await aud.Claim.claimPending(wallet)
      dispatch(setClaim({ wallet, hasClaim }))
    } catch (error) {
      console.error(error)
    }
  }
}

export function setClaimMetadata(): ThunkAction<
  void,
  AppState,
  Audius,
  Action
> {
  return async (dispatch, getState, aud) => {
    await aud.awaitSetup()
    try {
      const [
        fundsPerRound,
        lastFundedBlock,
        fundingRoundBlockDiff,
        totalClaimedInRound
      ] = await Promise.all([
        aud.Claim.getFundsPerRound(),
        aud.Claim.getLastFundedBlock(),
        aud.Claim.getFundingRoundBlockDiff(),
        aud.Claim.getTotalClaimedInRound()
      ])
      dispatch(
        setMetadata({
          fundsPerRound,
          lastFundedBlock,
          fundingRoundBlockDiff,
          totalClaimedInRound
        })
      )
    } catch (error) {
      console.error(error)
    }
  }
}

export const usePendingClaim = (wallet: Address) => {
  const pendingClaim = useSelector(getPendingClaim(wallet))
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (wallet && !pendingClaim) {
      dispatch(fetchPendingClaim(wallet))
    }
  }, [dispatch, wallet, pendingClaim])
  if (!pendingClaim) return { status: Status.Loading, hasClaim: false }
  return pendingClaim
}

export const useFundsPerRound = () => {
  const fundsPerRound = useSelector(getFundsPerRound())
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (!fundsPerRound) {
      dispatch(setClaimMetadata())
    }
  }, [dispatch, fundsPerRound])
  if (!fundsPerRound) return { status: Status.Loading }
  return { status: Status.Success, amount: fundsPerRound }
}

export const useLastFundedBlock = () => {
  const lastFundedBlock = useSelector(getLastFundedBlock())
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (!lastFundedBlock) {
      dispatch(setClaimMetadata())
    }
  }, [dispatch, lastFundedBlock])
  if (!lastFundedBlock) return { status: Status.Loading }
  return { status: Status.Success, blockNumber: lastFundedBlock }
}

export const useClaimMetadata = () => {
  const claimMetadata = useSelector(getClaimMetadata())
  const {
    fundsPerRound,
    lastFundedBlock,
    fundingRoundBlockDiff,
    totalClaimedInRound
  } = claimMetadata
  const notLoaded =
    fundsPerRound == null ||
    lastFundedBlock == null ||
    fundingRoundBlockDiff == null ||
    totalClaimedInRound == null
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (notLoaded) {
      dispatch(setClaimMetadata())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dispatch,
    fundsPerRound,
    lastFundedBlock,
    fundingRoundBlockDiff,
    totalClaimedInRound
  ])
  if (notLoaded) return { status: Status.Loading }
  return { status: Status.Success, claimMetadata }
}
