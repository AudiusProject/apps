import { createUseTikTokAuthHook } from '@audius/common/hooks'
import type { UseTikTokAuthArguments, Credentials } from '@audius/common/hooks'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { track, make } from 'app/services/analytics'
import { env } from 'app/services/env'
import { dispatch } from 'app/store'
import * as oauthActions from 'app/store/oauth/actions'
import { Provider } from 'app/store/oauth/reducer'
import { EventNames } from 'app/types/analytics'

const authenticationUrl = `${env.IDENTITY_SERVICE}/tiktok`

const authenticate = async (): Promise<Credentials> => {
  track(
    make({
      eventName: EventNames.TIKTOK_START_OAUTH
    })
  )

  return new Promise((resolve, reject) => {
    const handleResolve = (credentials: Credentials) => {
      track(
        make({
          eventName: EventNames.TIKTOK_COMPLETE_OAUTH
        })
      )
      resolve(credentials)
    }

    dispatch(
      oauthActions.requestNativeOpenPopup(
        handleResolve,
        reject,
        authenticationUrl,
        Provider.TIKTOK
      )
    )
  })
}

export const useTikTokAuth = (args: UseTikTokAuthArguments) => {
  return createUseTikTokAuthHook({
    authenticate,
    handleError: (e: Error) => {
      track(
        make({
          eventName: EventNames.TIKTOK_OAUTH_ERROR,
          error: e.message
        })
      )
    },
    getLocalStorageItem: AsyncStorage.getItem,
    setLocalStorageItem: AsyncStorage.setItem
  })(args)
}
