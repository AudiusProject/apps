import { Chain, Kind } from '@audius/common/models'
import { newUserMetadata } from '@audius/common/schemas'
import {
  accountSelectors,
  cacheActions,
  tokenDashboardPageActions,
  walletActions,
  getContext,
  confirmerActions,
  confirmTransaction,
  ConfirmRemoveWalletAction,
  getSDK
} from '@audius/common/store'
import { call, fork, put, select, takeLatest } from 'typed-redux-saga'

import {
  fetchEthereumCollectibles,
  fetchSolanaCollectibles
} from 'common/store/profile/sagas'
import { waitForWrite } from 'utils/sagaHelpers'

import { getAccountMetadataCID } from './getAccountMetadataCID'
import { CONNECT_WALLET_CONFIRMATION_UID } from './types'

const { getUserId, getAccountUser } = accountSelectors
const {
  confirmRemoveWallet,
  updateWalletError,
  removeWallet: removeWalletAction
} = tokenDashboardPageActions

const { getBalance } = walletActions

const { requestConfirmation } = confirmerActions

// TODO-NOW
function* removeWallet(action: ConfirmRemoveWalletAction) {
  yield* waitForWrite()
  const audiusBackendInstance = yield* getContext('audiusBackendInstance')
  const sdk = yield* getSDK()
  const removeWallet = action.payload.wallet
  const removeChain = action.payload.chain
  const accountUserId = yield* select(getUserId)
  const userMetadata = yield* select(getAccountUser)
  const updatedMetadata = newUserMetadata({ ...userMetadata })

  if (removeChain === Chain.Eth) {
    const currentAssociatedWallets = (yield* call(
      audiusBackendInstance.fetchUserAssociatedWallets,
      { user: updatedMetadata, sdk }
    ))?.associated_wallets
    if (
      currentAssociatedWallets &&
      !(removeWallet in currentAssociatedWallets)
    ) {
      // The wallet already removed from the associated wallets set
      yield* put(updateWalletError({ errorMessage: 'Wallet already removed' }))
      return
    }

    updatedMetadata.associated_wallets = {
      ...(currentAssociatedWallets || {})
    }

    delete updatedMetadata.associated_wallets[removeWallet]
  } else if (removeChain === Chain.Sol) {
    const currentAssociatedWallets = (yield* call(
      audiusBackendInstance.fetchUserAssociatedWallets,
      { user: updatedMetadata, sdk }
    ))?.associated_sol_wallets
    if (
      currentAssociatedWallets &&
      !(removeWallet in currentAssociatedWallets)
    ) {
      // The wallet already removed fromthe associated wallets set
      yield* put(updateWalletError({ errorMessage: 'Wallet already removed' }))
      return
    }

    updatedMetadata.associated_sol_wallets = {
      ...(currentAssociatedWallets || {})
    }
    delete updatedMetadata.associated_sol_wallets[removeWallet]
  }

  if (!accountUserId) {
    return
  }

  function* removeWalletFromUser() {
    const result = yield* call(audiusBackendInstance.updateCreator, {
      metadata: updatedMetadata,
      sdk
    })
    if (!result) {
      return
    }
    const { blockHash, blockNumber } = result

    const confirmed = yield* call(confirmTransaction, blockHash, blockNumber)
    if (!confirmed) {
      throw new Error(
        `Could not confirm remove wallet for account user id ${accountUserId}`
      )
    }
    return accountUserId
  }

  function* onSuccess() {
    // Update the user's balance w/ the new wallet
    yield* put(getBalance())
    yield* put(removeWalletAction({ wallet: removeWallet, chain: removeChain }))
    const updatedCID = yield* call(getAccountMetadataCID)
    if (accountUserId) {
      yield* put(
        cacheActions.update(Kind.USERS, [
          {
            id: accountUserId,
            metadata: { ...updatedMetadata, metadata_multihash: updatedCID }
          }
        ])
      )
    }

    yield* fork(fetchSolanaCollectibles, updatedMetadata)
    yield* fork(fetchEthereumCollectibles, updatedMetadata)
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
