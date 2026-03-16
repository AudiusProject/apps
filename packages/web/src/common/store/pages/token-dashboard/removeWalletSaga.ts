import { QUERY_KEYS, queryCurrentUserId } from '@audius/common/api'
import {
  tokenDashboardPageActions,
  confirmerActions,
  ConfirmRemoveWalletAction,
  getSDK
} from '@audius/common/store'
import { Id } from '@audius/sdk/services'
import { QueryClient } from '@tanstack/react-query'
import { call, getContext, put, takeLatest } from 'typed-redux-saga'

import { waitForWrite } from 'utils/sagaHelpers'

import { CONNECT_WALLET_CONFIRMATION_UID } from './types'

const {
  confirmRemoveWallet,
  updateWalletError,
  removeWallet: removeWalletAction
} = tokenDashboardPageActions

const { requestConfirmation } = confirmerActions

function* removeWallet(action: ConfirmRemoveWalletAction) {
  yield* waitForWrite()
  const sdk = yield* getSDK()
  const removeWallet = action.payload.wallet
  const removeChain = action.payload.chain
  const accountUserId = yield* call(queryCurrentUserId)

  if (!accountUserId) {
    return
  }

  function* removeWalletFromUser() {
    yield* call([sdk.users, sdk.users.removeAssociatedWallet], {
      userId: Id.parse(accountUserId),
      wallet: { address: removeWallet, chain: removeChain }
    })

    return accountUserId
  }

  function* onSuccess() {
    const queryClient = yield* getContext<QueryClient>('queryClient')
    // Trigger a refetch for all audio balances
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEYS.audioBalance]
    })
    yield* put(removeWalletAction({ wallet: removeWallet, chain: removeChain }))
  }

  function* onError() {
    yield* put(updateWalletError({ errorMessage: 'Unable to remove wallet' }))
  }

  yield* put(
    requestConfirmation(
      CONNECT_WALLET_CONFIRMATION_UID,
      removeWalletFromUser,
      onSuccess,
      onError
    )
  )
}

export function* watchRemoveWallet() {
  yield* takeLatest(confirmRemoveWallet.type, removeWallet)
}
