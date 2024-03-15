import { useSelector, useDispatch } from 'react-redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'
import { Action } from 'redux'
import BN from 'bn.js'

import { Address, User, Operator, Status } from 'types'
import Audius from 'services/Audius'
import { AppState } from 'store/types'
import { useEffect } from 'react'

import {
  useFundsPerRound,
  useLastFundedBlock,
  usePendingClaim
} from 'store/cache/claims/hooks'
import { useEthBlockNumber } from 'store/cache/protocol/hooks'
import { useUsers } from 'store/cache/user/hooks'
import { fetchWeeklyRewards, setWeeklyRewards } from 'store/cache/rewards/slice'
import { getRewardForClaimBlock } from './helpers'
import { AnyAction } from '@reduxjs/toolkit'

// -------------------------------- Selectors  --------------------------------
export const getUserRewards = (wallet: Address) => (state: AppState) =>
  state.cache.rewards.users[wallet]

export const getUserWeeklyRewards = (wallet: Address) => (state: AppState) => {
  const userReward = state.cache.rewards.users[wallet]
  return userReward?.status === Status.Success ? userReward.reward : undefined
}

// -------------------------------- Thunk Actions  --------------------------------

export function fetchRewards({
  wallet,
  fundsPerRound,
  users,
  currentBlockNumber
}: {
  wallet: Address
  currentBlockNumber: number
  fundsPerRound: BN
  users: (User | Operator)[]
  lastFundedBlock: number
  hasClaim: boolean
}): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    dispatch(fetchWeeklyRewards({ wallet }))
    await aud.awaitSetup()
    try {
      // NOTE: If blocknumber is set to lastFundedBlock, then the reward will represent the pending claim amount
      const blockNumber = currentBlockNumber
      const {
        totalRewards,
        delegateToUserRewards
      } = await getRewardForClaimBlock({
        wallet,
        users,
        fundsPerRound,
        blockNumber,
        aud
      })
      dispatch(
        setWeeklyRewards({
          wallet,
          reward: totalRewards,
          delegateToUserRewards
        })
      )
    } catch (error) {
      // TODO: Handle error case
      console.log(error)
    }
  }
}

// -------------------------------- Hooks  --------------------------------

export const useUserWeeklyRewards = ({ wallet }: { wallet: Address }) => {
  const weeklyRewards = useSelector(getUserRewards(wallet))
  const currentBlockNumber = useEthBlockNumber()
  const { status: fundsStatus, amount: fundsPerRound } = useFundsPerRound()
  const {
    status: lastFundedStatus,
    blockNumber: lastFundedBlock
  } = useLastFundedBlock()
  const { status: usersStatus, users } = useUsers()
  const { status: claimStatus, hasClaim } = usePendingClaim(wallet)

  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    const hasInfo = [
      fundsStatus,
      usersStatus,
      lastFundedStatus,
      claimStatus
    ].every(status => status === Status.Success)
    if (wallet && hasInfo && currentBlockNumber && !weeklyRewards) {
      dispatch(
        fetchRewards({
          wallet,
          fundsPerRound: fundsPerRound!,
          users,
          lastFundedBlock: lastFundedBlock!,
          currentBlockNumber,
          hasClaim
        })
      )
    }
  }, [
    dispatch,
    wallet,
    weeklyRewards,
    fundsStatus,
    usersStatus,
    lastFundedStatus,
    claimStatus,
    fundsPerRound,
    users,
    currentBlockNumber,
    lastFundedBlock,
    hasClaim
  ])
  if (!weeklyRewards) return { status: Status.Loading }
  return weeklyRewards
}

export const useUserAnnualRewardRate = ({ wallet }: { wallet: Address }) => {
  const weeklyRewards = useUserWeeklyRewards({ wallet })
  if (weeklyRewards.status === Status.Success && 'reward' in weeklyRewards) {
    const amount = weeklyRewards.reward.mul(new BN('52'))
    const amountByDelegate = Object.keys(
      weeklyRewards.delegateToUserRewards
    ).reduce((acc, d) => {
      acc[d] = weeklyRewards.delegateToUserRewards[d].mul(new BN('52'))
      return acc
    }, {})
    return {
      status: Status.Success,
      reward: amount,
      delegateToUserRewards: amountByDelegate
    }
  }
  return { status: Status.Loading }
}
