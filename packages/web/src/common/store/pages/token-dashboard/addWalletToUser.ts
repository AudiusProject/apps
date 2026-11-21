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
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.audioBalance]
    })

    yield* put(setWalletAddedConfirmed({}))

    yield* call(disconnect)
  }

  function* onError() {
    yield* put(
      updateWalletError({
        errorMessage:
          'An error occured while connecting a wallet with your account.'
      })
    )
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
