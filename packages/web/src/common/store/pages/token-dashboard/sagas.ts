import { userWalletsFromSDK } from '@audius/common/adapters'
import { queryCurrentUserId } from '@audius/common/api'
import { Chain } from '@audius/common/models'
import {
  tokenDashboardPageActions,
  getContext,
  getSDK
} from '@audius/common/store'
import { Id } from '@audius/sdk'
import { call, put, takeLatest } from 'typed-redux-saga'

import { waitForRead } from 'utils/sagaHelpers'

import { watchRemoveWallet } from './removeWalletSaga'

const {
  fetchAssociatedWallets,
  setAssociatedWallets,
  fetchAssociatedWalletsFailed
} = tokenDashboardPageActions

function* fetchEthWalletInfo(wallets: string[]) {
  const walletClient = yield* getContext('walletClient')
  const ethWalletBalances = yield* call(
    [walletClient, walletClient.getEthWalletBalances],
    wallets
  )

  return wallets.map((_, idx) => ({
    ...ethWalletBalances[idx],
    balance: BigInt(ethWalletBalances[idx].balance.toString())
  }))
}

function* fetchSplWalletInfo(wallets: string[]) {
  const walletClient = yield* getContext('walletClient')
  const splWalletBalances = yield* call(
    [walletClient, 'getSolWalletBalances'],
    wallets
  )

  return wallets.map((_, idx) => ({
    ...splWalletBalances[idx],
    balance: BigInt(splWalletBalances[idx].balance.toString())
  }))
}

function* fetchAccountAssociatedWallets() {
  try {
    yield* waitForRead()
    const sdk = yield* getSDK()
    const accountUserId = yield* call(queryCurrentUserId)
    if (!accountUserId) return

    const { data } = yield* call([sdk.users, sdk.users.getConnectedWallets], {
      id: Id.parse(accountUserId)
    })

    if (!data) {
      throw new Error('No data found')
    }

    const associatedWallets = userWalletsFromSDK(data)

    const ethWalletBalances = yield* fetchEthWalletInfo(
      associatedWallets.wallets
    )
    const splWalletBalances = yield* fetchSplWalletInfo(
      associatedWallets.sol_wallets ?? []
    )

    yield* put(
      setAssociatedWallets({
        associatedWallets: ethWalletBalances,
        chain: Chain.Eth
      })
    )
    yield* put(
      setAssociatedWallets({
        associatedWallets: splWalletBalances,
        chain: Chain.Sol
      })
    )
  } catch (e) {
    console.error(e)
    yield* put(
      fetchAssociatedWalletsFailed({ errorMessage: (e as Error).message })
    )
  }
}

function* watchGetAssociatedWallets() {
  yield* takeLatest(fetchAssociatedWallets.type, fetchAccountAssociatedWallets)
}

const sagas = () => {
  return [watchGetAssociatedWallets, watchRemoveWallet]
}

export default sagas
