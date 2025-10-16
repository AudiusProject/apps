import { Chain } from '@audius/common/models'
import { getContext } from '@audius/common/store'
import { call } from 'typed-redux-saga'

export function* getWalletInfo(walletAddress: string, chain: Chain) {
  const walletClient = yield* getContext('walletClient')

  const [{ balance }] = yield* call(
    [
      walletClient,
      chain === Chain.Eth
        ? walletClient.getEthWalletBalances
        : walletClient.getSolWalletBalances
    ],
    [walletAddress]
  )

  return { balance }
}
