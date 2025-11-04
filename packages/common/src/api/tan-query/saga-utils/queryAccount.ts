import { call } from 'typed-redux-saga'

import { AccountState } from '~/store'
import { getContext } from '~/store/effects'
import { getSDK } from '~/store/sdkUtils'

import {
  getCurrentAccountQueryFn,
  getCurrentAccountQueryKey
} from '../users/account/useCurrentAccount'
import { getWalletAddressesQueryKey } from '../users/account/useWalletAddresses'

import { queryUser } from './queryUser'

export function* queryCurrentAccount() {
  const sdk = yield* getSDK()
  const queryClient = yield* getContext('queryClient')
  const localStorage = yield* getContext('localStorage')
  const walletAddresses = queryClient.getQueryData(
    getWalletAddressesQueryKey()
  ) ?? {
    currentUser: null,
    web3User: null
  }
  const currentUserWallet = walletAddresses.currentUser

  const queryData = yield* call([queryClient, queryClient.fetchQuery], {
    queryKey: getCurrentAccountQueryKey(),
    queryFn: async () =>
      getCurrentAccountQueryFn(
        sdk,
        localStorage,
        currentUserWallet,
        queryClient
      ),
    staleTime: Infinity,
    gcTime: Infinity
  })

  return queryData as AccountState | null | undefined
}

export function* queryHasAccount() {
  const account = yield* call(queryCurrentAccount)
  return !!account?.userId
}

export function* queryIsAccountComplete() {
  const account = yield* call(queryCurrentAccount)
  if (!account) return false
  const accountUser = yield* call(queryUser, account?.userId)
  // an account is complete if it has a handle and name
  return !!accountUser?.handle && !!accountUser?.name
}

export function* queryAccountUser() {
  const account = yield* call(queryCurrentAccount)
  if (!account) return undefined
  const accountUser = yield* call(queryUser, account?.userId)
  return accountUser
}

export function* queryCurrentUserId() {
  const account = yield* call(queryCurrentAccount)
  return account?.userId
}

export function* queryWalletAddresses() {
  const queryClient = yield* getContext('queryClient')
  const walletAddresses = queryClient.getQueryData(
    getWalletAddressesQueryKey()
  ) ?? {
    currentUser: null,
    web3User: null
  }
  return walletAddresses
}
