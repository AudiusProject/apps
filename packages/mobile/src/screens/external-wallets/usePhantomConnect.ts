import { useEffect } from 'react'

import { tokenDashboardPageActions } from '@audius/common/store'
import { useRoute } from '@react-navigation/native'
import { useDispatch } from 'react-redux'

import {
  connect,
  connectNewWallet,
  signMessage
} from 'app/store/wallet-connect/slice'

import type { ExternalWalletsRoute } from './types'

const { updateWalletError } = tokenDashboardPageActions

export const usePhantomConnect = (
  getParamsFromRoute: (
    route: ExternalWalletsRoute<'Wallets'>
  ) => ExternalWalletsRoute<'Wallets'>['params'] = (route) => route.params
) => {
  const dispatch = useDispatch()
  const route = useRoute<ExternalWalletsRoute<'Wallets'>>()
  const params = getParamsFromRoute(
    route
  ) as ExternalWalletsRoute<'Wallets'>['params']

  useEffect(() => {
    if (!params) return
    if ('errorCode' in params) {
      dispatch(updateWalletError({ errorMessage: params.errorMessage }))
      return
    }

    if (params.path === 'connect') {
      dispatch(connect({ ...params, connectionType: 'phantom' }))
      // Connect creates a session between Audius and phantom
    } else if (params.path === 'wallet-connect') {
      dispatch(connectNewWallet({ ...params, connectionType: 'phantom' }))
    } else if (params.path === 'wallet-sign-message') {
      dispatch(signMessage({ ...params, connectionType: 'phantom' }))
    }
  }, [params?.path, params, dispatch])
}
