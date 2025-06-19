import { userWalletsFromSDK } from '@audius/common/adapters'
import { queryCurrentUserId } from '@audius/common/api'
import { Chain, CollectibleState, BNWei } from '@audius/common/models'
import {
  tokenDashboardPageActions,
  getContext,
  getSDK
} from '@audius/common/store'
import { Id } from '@audius/sdk'
import BN from 'bn.js'
import { call, put, takeLatest } from 'typed-redux-saga'

import {
  fetchEthereumCollectiblesForWallets,
  fetchSolanaCollectiblesForWallets
} from 'common/store/profile/sagas'
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

  const collectiblesMap = (yield* call(
    fetchEthereumCollectiblesForWallets,
    wallets
  )) as CollectibleState

  const collectibleCounts = wallets.map(
    (wallet) => collectiblesMap[wallet]?.length ?? 0
  )

  return wallets.map((_, idx) => ({
    ...ethWalletBalances[idx],
    balance: new BN(ethWalletBalances[idx].balance.toString()) as BNWei,
    collectibleCount: collectibleCounts[idx]
  }))
}

function* fetchSplCollectibles(wallets: string[]) {
  const collectiblesMap = (yield* call(
    fetchSolanaCollectiblesForWallets,
    wallets
  )) as CollectibleState

  const collectibleCounts = wallets.map(
    (wallet) => collectiblesMap[wallet]?.length ?? 0
  )

  return wallets.map((_, idx) => ({
    collectibleCount: collectibleCounts[idx]
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
    balance: new BN(splWalletBalances[idx].balance.toString()) as BNWei
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

    // Put balances first w/o collectibles

    yield* put(
      setAssociatedWallets({
        associatedWallets: ethWalletBalances,
        chain: Chain.Eth
      })
    )
    yield* put(
      setAssociatedWallets({
        associatedWallets: splWalletBalances.map((b) => ({
          ...b,
          collectibleCount: 0
        })),
        chain: Chain.Sol
      })
    )

    // Add collectibles, this can take a while if fetching metadata is slow

    const splWalletCollectibles = yield* fetchSplCollectibles(
      associatedWallets.sol_wallets ?? []
    )

    yield* put(
      setAssociatedWallets({
        associatedWallets: splWalletBalances.map((b, i) => ({
          ...b,
          collectibleCount: splWalletCollectibles[i].collectibleCount
        })),
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
