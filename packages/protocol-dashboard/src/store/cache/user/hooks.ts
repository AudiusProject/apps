import { useEffect, useState } from 'react'

import { DashboardWalletUser } from '@audius/sdk'
import { AnyAction } from '@reduxjs/toolkit'
import BN from 'bn.js'
import { useDispatch, useSelector } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import { useDashboardWalletUser } from 'hooks/useDashboardWalletUsers'
import Audius from 'services/Audius'
import { GetPendingDecreaseStakeRequestResponse } from 'services/Audius/service-provider/types'
import { useAccountUser } from 'store/account/hooks'
import { AppState } from 'store/types'
import {
  Address,
  Delegate,
  Operator,
  ServiceProvider,
  ServiceType,
  SortUser,
  Status,
  User
} from 'types'
import getActiveStake, { getTotalActiveDelegatedStake } from 'utils/activeStake'
import { getRandomDefaultImage } from 'utils/identicon'

import {
  fetchContentNodes,
  getFilteredNodes as getCNNodes
} from '../contentNode/hooks'
import {
  fetchDiscoveryProviders,
  getFilteredNodes as getDPNodes
} from '../discoveryProvider/hooks'
import {
  fetchValidators,
  getFilteredNodes as getValidators
} from '../validator/hooks'

import {
  useUser as useGraphUser,
  useUsers as useGraphUsers
} from './graph/hooks'
import { setLoading, setUserProfile, setUsers } from './slice'

type UseUsersProp = {
  sortBy?: SortUser
  limit?: number
  filter?: 'isOperator' | 'isDelegator'
}

// -------------------------------- Selectors  --------------------------------
export const getStatus = (state: AppState) => state.cache.user.status
export const getUser = (wallet: Address) => (state: AppState) =>
  state.cache.user.accounts[wallet]

const sortActiveStakeFunc = (u1: User | Operator, u2: User | Operator) => {
  const u1Total = getActiveStake(u1)
  const u2Total = getActiveStake(u2)
  return u2Total.cmp(u1Total)
}

const sortStakePlusDelegatedFunc = (
  u1: User | Operator,
  u2: User | Operator
) => {
  const u1Total = getActiveStake(u1).add(getTotalActiveDelegatedStake(u1))
  const u2Total = getActiveStake(u2).add(getTotalActiveDelegatedStake(u2))
  return u2Total.cmp(u1Total)
}

export const getUsers =
  ({ sortBy, limit, filter }: UseUsersProp) =>
  (state: AppState) => {
    const userAccounts = state.cache.user.accounts
    const accounts: (User | Operator)[] = Object.values(userAccounts)

    const filterFunc = (user: User | Operator) => {
      if (filter === 'isOperator') return 'serviceProvider' in user
      return true
    }

    let serviceProviders: (User | Operator)[] = accounts.filter(
      filterFunc
    ) as any
    if (sortBy === SortUser.activeStake) {
      serviceProviders = serviceProviders.sort(sortActiveStakeFunc)
    } else if (sortBy === SortUser.stakePlusDelegates) {
      serviceProviders = serviceProviders.sort(sortStakePlusDelegatedFunc)
    }
    if (limit) serviceProviders = serviceProviders.slice(0, limit)

    return serviceProviders
  }

// -------------------------------- Helpers  --------------------------------

const getUserMetadata = async (wallet: Address, aud: Audius): Promise<User> => {
  const audToken = await aud.AudiusToken.balanceOf(wallet)
  const delegates = await aud.getUserDelegates(wallet)
  const totalDelegatorStake = await aud.Delegate.getTotalDelegatorStake(wallet)
  const pendingUndelegateRequest =
    await aud.Delegate.getPendingUndelegateRequest(wallet)
  const voteHistory = await aud.Governance.getVotesByAddress([wallet])

  const user = {
    wallet,
    totalDelegatorStake,
    pendingUndelegateRequest,
    audToken,
    delegates,
    voteHistory,
    events: []
  }

  return user
}

const getServiceProviderMetadata = async (
  wallet: Address,
  aud: Audius
): Promise<{
  serviceProvider: ServiceProvider
  discoveryProviders: Array<number>
  pendingDecreaseStakeRequest: GetPendingDecreaseStakeRequestResponse
  contentNodes: Array<number>
  validators: Array<number>
  delegators: Array<Delegate>
  delegatedTotal: BN
  totalStakedFor: BN
  minDelegationAmount: BN
}> => {
  const totalStakedFor = await aud.Staking.totalStakedFor(wallet)
  const delegatedTotal =
    await aud.Delegate.getTotalDelegatedToServiceProvider(wallet)
  const delegators = await getDelegatorAmounts(wallet, aud)
  delegators.sort((a, b) => (b.activeAmount.gt(a.activeAmount) ? 1 : -1))
  const serviceProvider: ServiceProvider =
    await aud.ServiceProviderClient.getServiceProviderDetails(wallet)
  const discoveryProviders =
    await aud.ServiceProviderClient.getServiceProviderIdsFromAddress(
      wallet,
      ServiceType.DiscoveryProvider
    )
  const contentNodes =
    await aud.ServiceProviderClient.getServiceProviderIdsFromAddress(
      wallet,
      ServiceType.ContentNode
    )
  const validators =
    await aud.ServiceProviderClient.getServiceProviderIdsFromAddress(
      wallet,
      ServiceType.Validator
    )
  const pendingDecreaseStakeRequest =
    await aud.ServiceProviderClient.getPendingDecreaseStakeRequest(wallet)

  const protocolMinDelegationAmount =
    await aud.Delegate.getMinDelegationAmount()
  const spMinDelegationAmount =
    await aud.Delegate.getSPMinDelegationAmount(wallet)
  // Prefer service provider min delegation amount if provided and greater than protocol wide amount
  const minDelegationAmount = spMinDelegationAmount.gt(
    protocolMinDelegationAmount
  )
    ? spMinDelegationAmount
    : protocolMinDelegationAmount

  return {
    serviceProvider,
    discoveryProviders,
    pendingDecreaseStakeRequest,
    contentNodes,
    validators,
    totalStakedFor,
    delegatedTotal,
    delegators,
    minDelegationAmount
  }
}

const getDelegatorAmounts = async (
  wallet: Address,
  aud: Audius
): Promise<
  Array<{
    wallet: Address
    amount: BN
    activeAmount: BN
    // name?: string
    // img: string
  }>
> => {
  const delegators = await aud.Delegate.getDelegatorsList(wallet)
  const delegatorAmounts = []
  for (const delegatorWallet of delegators) {
    const amountDelegated =
      await aud.Delegate.getDelegatorStakeForServiceProvider(
        delegatorWallet,
        wallet
      )
    let activeAmount = amountDelegated
    const pendingUndelegateRequest =
      await aud.Delegate.getPendingUndelegateRequest(delegatorWallet)

    if (
      pendingUndelegateRequest.lockupExpiryBlock !== 0 &&
      pendingUndelegateRequest.target === wallet
    ) {
      activeAmount = activeAmount.sub(pendingUndelegateRequest.amount)
    }

    delegatorAmounts.push({
      wallet: delegatorWallet,
      amount: amountDelegated,
      activeAmount
    })
  }
  return delegatorAmounts
}

// -------------------------------- Thunk Actions  --------------------------------

// Async function to get
function fetchUsers(): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    dispatch(setLoading())
    await Promise.all([
      dispatch(fetchDiscoveryProviders()),
      dispatch(fetchContentNodes()),
      dispatch(fetchValidators())
    ])
    const state = getState()
    const dpNodes = getDPNodes()(state)
    const cnNodes = getCNNodes()(state)
    const validators = getValidators()(state)
    let serviceProviderWallets = dpNodes
      .map((dp) => dp.owner)
      .concat(cnNodes.map((cn) => cn.owner))
      .concat(validators.map((v) => v.owner))
    // @ts-ignore
    serviceProviderWallets = [...new Set(serviceProviderWallets)]

    const users: { [wallet: string]: User | Operator } = {}
    await Promise.all(
      serviceProviderWallets.map(async (wallet) => {
        const user = await getUserMetadata(wallet, aud)
        const serviceProvider = await getServiceProviderMetadata(wallet, aud)
        users[wallet] = {
          ...user,
          ...serviceProvider
        }
      })
    )

    // Get all delegators that are not service operators
    let delegators = Object.keys(users).reduce(
      (delgators: string[], operatorWallet) => {
        const operator = users[operatorWallet]
        const operatorDelegators = (operator as Operator).delegators
          .map((delegator) => delegator.wallet)
          .filter((wallet) => !(wallet in users))
        return delgators.concat(operatorDelegators)
      },
      []
    )
    // @ts-ignore
    delegators = [...new Set(delegators)]

    await Promise.all(
      delegators.map(async (wallet) => {
        const user = await getUserMetadata(wallet, aud)
        users[wallet] = user
      })
    )

    dispatch(
      setUsers({
        users,
        status: Status.Success
      })
    )
  }
}

// Async function to get
export function fetchUser(
  wallet: Address,
  setStatus?: (status: Status) => void
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    if (setStatus) setStatus(Status.Loading)
    const user = await getUserMetadata(wallet, aud)

    const totalStaked = await aud.Staking.totalStakedFor(wallet)
    if (!totalStaked.gt(new BN('0'))) {
      dispatch(
        setUsers({
          users: { [wallet]: user }
        })
      )
    } else {
      const serviceProvider = await getServiceProviderMetadata(wallet, aud)
      const account = {
        ...user,
        ...serviceProvider
      }
      dispatch(
        setUsers({
          users: { [wallet]: account }
        })
      )
    }
    if (setStatus) setStatus(Status.Success)
  }
}

export function fetchUserProfile(
  wallet: Address
): ThunkAction<void, AppState, Audius, Action<string>> {
  return async (dispatch, getState, aud) => {
    const profile = { image: getRandomDefaultImage(wallet) }
    dispatch(
      setUserProfile({
        wallet,
        image: profile.image,
        name: wallet
      })
    )
  }
}

// -------------------------------- Hooks  --------------------------------
export const useUsers = ({ limit, sortBy, filter }: UseUsersProp = {}) => {
  const status = useSelector(getStatus)
  const users = useSelector(getUsers({ limit, sortBy, filter }))

  const { error } = useGraphUsers(status)

  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (error && !status) {
      dispatch(fetchUsers())
    }
  }, [error, status, limit, sortBy, dispatch])

  return { status, users }
}

type UseUserProps = { wallet: Address }
type UseUserResponse =
  | {
      user: User | Operator
      audiusProfile?: DashboardWalletUser['user'] | null
      status: Status.Success | Status.Loading
    }
  | {
      user: undefined
      audiusProfile?: DashboardWalletUser['user'] | null
      status: Status.Failure | Status.Loading
    }
export const useUser = ({ wallet }: UseUserProps): UseUserResponse => {
  const [userStatus, setUserStatus] = useState(Status.Loading)
  const user = useSelector(getUser(wallet))
  const { data: connectedAudiusUserData, status: connectedAudiusUserStatus } =
    useDashboardWalletUser(wallet)
  const connectedAudiusUser = connectedAudiusUserData?.user
  useEffect(() => {
    if (userStatus !== Status.Loading) {
      setUserStatus(Status.Loading)
    }
    // Only want to run this effect when wallet changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet])

  const { error } = useGraphUser(wallet, setUserStatus, !!user)

  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (error && !user && userStatus !== Status.Failure) {
      dispatch(fetchUser(wallet, setUserStatus))
    }
  }, [error, wallet, user, setUserStatus, userStatus, dispatch])
  if (user && connectedAudiusUserStatus !== 'pending') {
    if (userStatus !== Status.Success) setUserStatus(Status.Success)
    return { user, audiusProfile: connectedAudiusUser, status: Status.Success }
  } else if (user && connectedAudiusUserStatus === 'pending') {
    return { user, audiusProfile: connectedAudiusUser, status: Status.Loading }
  } else if (!user && userStatus === Status.Success) {
    return {
      user: undefined,
      audiusProfile: connectedAudiusUser,
      status: userStatus as Status.Loading | Status.Failure
    }
  } else {
    return {
      user: undefined,
      audiusProfile: connectedAudiusUser,
      status: userStatus as Status.Loading | Status.Failure
    }
  }
}

type UseDelegatorsProps = { wallet: Address }
export const useDelegators = ({ wallet }: UseDelegatorsProps) => {
  const { status, user } = useUser({ wallet })
  if (status !== Status.Success || !user || !('delegators' in user)) {
    return { status, delegators: [] }
  }
  return { status, delegators: user.delegators }
}

type UseDelegatesProps = { wallet: Address }
export const useDelegates = ({ wallet }: UseDelegatesProps) => {
  const { status, user } = useUser({ wallet })
  if (status !== Status.Success || !user) {
    return { status, delegates: [] }
  }
  return { status, delegates: user.delegates }
}

type UseTotalDelegatesProps = { wallet: Address }
export const useTotalDelegates = ({ wallet }: UseTotalDelegatesProps) => {
  const { status, user } = useUser({ wallet })
  if (status !== Status.Success || !user) {
    return { status, totalDelegates: new BN('0') }
  }
  const totalDelegates = user.delegates.reduce(
    (total, delegate) => total.add(delegate.amount),
    new BN('0')
  )
  return { status, totalDelegates }
}

/** Returns the total amount delegated inbound to an SP */
export const useActiveInboundDelegation = ({ wallet }: { wallet: Address }) => {
  const { status, user } = useUser({ wallet })
  if (status !== Status.Success || !user) {
    return { status, amount: new BN('0') }
  }

  const totalDelegated = (user as Operator).delegators
  if (!totalDelegated) return { status, amount: new BN('0') }

  const totalInboundDelegation = (user as Operator).delegators.reduce(
    (total, delegator) => total.add(delegator.activeAmount),
    new BN('0')
  )
  return { status, amount: totalInboundDelegation }
}

/**
 * Get the amount the signed in user delegates to the wallet address
 */
type UseUserDelegates = { wallet: Address }
export const useUserDelegates = ({ wallet }: UseUserDelegates) => {
  const { status, user } = useAccountUser()
  if (status !== Status.Success || !user) {
    return { status: status || Status.Loading, delegates: new BN('0') }
  }
  const userDelegates = user.delegates.find((d) => d.wallet === wallet)
  if (userDelegates) {
    return { status: Status.Success, delegates: userDelegates.amount }
  }
  return { status: Status.Success, delegates: new BN('0') }
}

const inFlight = new Set<Address>([])
type UseUserProfile = { wallet: Address }
export const useUserProfile = ({ wallet }: UseUserProfile) => {
  const { user, audiusProfile, status } = useUser({ wallet })

  const image =
    status !== Status.Loading
      ? (audiusProfile?.profilePicture?._480x480 ?? user.image)
      : undefined

  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()
  useEffect(() => {
    if (user && !inFlight.has(wallet)) {
      inFlight.add(wallet)
      dispatch(fetchUserProfile(wallet))
    }
  }, [dispatch, user, wallet])

  if (user) {
    return { image, name: audiusProfile?.name ?? user.name, status }
  }
  return {}
}
