import { QUERY_KEYS, queryCurrentUserId } from '@audius/common/api'
import { Chain } from '@audius/common/models'
import {
  tokenDashboardPageActions,
  confirmerActions,
  getSDK
} from '@audius/common/store'
import { Id } from '@audius/sdk'
import { QueryClient } from '@tanstack/react-query'
import { call, getContext, put } from 'typed-redux-saga'

import { CONNECT_WALLET_CONFIRMATION_UID } from './types'
const { setWalletAddedConfirmed, updateWalletError } = tokenDashboardPageActions
const { requestConfirmation } = confirmerActions

export function* addWalletToUser(
  {
    walletAddress,
    chain,
    signature
  }: { walletAddress: string; chain: Chain; signature: string },
  disconnect: () => Generator
) {
  const sdk = yield* getSDK()
  const accountUserId = yield* call(queryCurrentUserId)
  if (!accountUserId) return

  function* transactMetadata() {
    const result = yield* call([sdk.users, sdk.users.addAssociatedWallet], {
      userId: Id.parse(accountUserId),
      wallet: { address: walletAddress, chain },
      signature
    })

    if (!result) {
      throw new Error(
        `Could not confirm connect wallet for account user id ${accountUserId}`
      )
    }
  }

  function* onSuccess() {
    const queryClient = yield* getContext<QueryClient>('queryClient')
    // Trigger a refetch for all audio balances
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.audioBalance]
    })

    yield* put(setWalletAddedConfirmed({}))

    // Disconnect the web3 instance because after we've linked, we no longer need it
    yield* call(disconnect)
  }

  function* onError() {
    yield* put(
      updateWalletError({
        errorMessage:
          'An error occured while connecting a wallet with your account.'
      })
    )
    // Disconnect the web3 instance in the event of an error, we no longer need it
    yield* call(disconnect)
  }

  yield* put(
    requestConfirmation(
      CONNECT_WALLET_CONFIRMATION_UID,
      transactMetadata,
      onSuccess,
      onError
    )
  )
}
