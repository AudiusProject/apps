import { queryWalletAddresses } from '@audius/common/api'
import {
  wormholeConversionActions,
  toastActions,
  getContext
} from '@audius/common/store'
import { call, put, takeEvery } from 'typed-redux-saga'

import { reportToSentry } from 'store/errors/reportToSentry'

const { startConversion, conversionSuccess, conversionFailed } =
  wormholeConversionActions
const { toast } = toastActions

function* convertEthToSolanaAsync() {
  const walletClient = yield* getContext('walletClient')

  try {
    const { currentUser } = yield* call(queryWalletAddresses)
    if (!currentUser) {
      throw new Error('Failed to retrieve current user wallet address')
    }

    // Check if user has ETH AUDIO balance
    const ethBalance = yield* call(
      [walletClient, walletClient.getCurrentBalance],
      {
        ethAddress: currentUser
      }
    )

    if (!ethBalance || ethBalance === BigInt(0)) {
      throw new Error('No ETH AUDIO balance to convert')
    }

    // Perform the conversion
    yield* call([walletClient, walletClient.transferTokensFromEthToSol], {
      ethAddress: currentUser
    })

    yield* put(conversionSuccess())

    // Show success toast
    yield* put(
      toast({
        content: 'Successfully converted AUDIO to Solana',
        type: 'info'
      })
    )
  } catch (error) {
    const e = error instanceof Error ? error : new Error(String(error))
    console.error('Wormhole conversion failed', error)

    yield* put(conversionFailed({ error: e.message }))

    // Show error toast
    yield* put(
      toast({
        content: `Conversion failed: ${e.message}`,
        type: 'error'
      })
    )

    yield* call(reportToSentry, {
      name: 'WormholeConversion',
      error: e
    })
  }
}

function* watchStartConversion() {
  yield* takeEvery(startConversion.type, convertEthToSolanaAsync)
}

const sagas = () => {
  return [watchStartConversion]
}

export default sagas
