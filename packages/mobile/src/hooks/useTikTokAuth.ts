import { createUseTikTokAuthHook, useFeatureFlag } from '@audius/common/hooks'
import type { UseTikTokAuthArguments, Credentials } from '@audius/common/hooks'
import { Feature } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import AsyncStorage from '@react-native-async-storage/async-storage'
import CookieManager from '@react-native-cookies/cookies'
import { Linking } from 'react-native'
import {
  init as tikTokInit,
  auth as tikTokAuth,
  events as tikTokEvents
} from 'react-native-tiktok'

import { track, make } from 'app/services/analytics'
import { env } from 'app/services/env'
import { dispatch } from 'app/store'
import * as oauthActions from 'app/store/oauth/actions'
import { Provider } from 'app/store/oauth/reducer'
import { EventNames } from 'app/types/analytics'
import { reportToSentry } from 'app/utils/reportToSentry'

const authenticationUrl = `${env.IDENTITY_SERVICE}/tiktok`

const canOpenTikTok = () => {
  return Linking.canOpenURL('tiktok://app')
}

const createAuthenticate =
  (isNativeTikTokAuthEnabled: boolean) => async (): Promise<Credentials> => {
    track(
      make({
        eventName: EventNames.TIKTOK_START_OAUTH
      })
    )

    // Perform WebView auth if TikTok is not installed
    // TikTok LoginKit is supposed to handle this but it doesn't seem to work
    if (!(await canOpenTikTok()) || !isNativeTikTokAuthEnabled) {
      return new Promise((resolve, reject) => {
        dispatch(
          oauthActions.requestNativeOpenPopup(
            resolve,
            reject,
            authenticationUrl,
            Provider.TIKTOK
          )
        )
      })
    }

    tikTokInit(env.TIKTOK_APP_ID!)

    return new Promise((resolve, reject) => {
      let authDone = false

      const handleTikTokAuth = async (
        code: string,
        hasError: boolean | null,
        errorMessage: string
      ) => {
        if (authDone) {
          console.warn('TikTok auth already completed')
          return
        }

        if (hasError) {
          const error = new Error(errorMessage)
          reportToSentry({
            error,
            name: 'Sign Up: TikTok auth response had an error',
            additionalInfo: {
              code,
              hasError,
              errorMessage
            },
            tags: {
              socialMedia: 'tiktok'
            },
            feature: Feature.SignUp
          })
          return reject(error)
        }

        // Need to set a csrf cookie because it is required for web
        await CookieManager.set(env.IDENTITY_SERVICE!, {
          name: 'csrfState',
          value: 'true'
        })

        try {
          const response = await fetch(
            `${env.IDENTITY_SERVICE}/tiktok/access_token`,
            {
              credentials: 'include',
              method: 'POST',
              body: JSON.stringify({
                code,
                state: 'true'
              }),
              headers: {
                'Content-Type': 'application/json'
              }
            }
          )

          if (!response.ok) {
            const authError = new Error(errorMessage)
            reportToSentry({
              error: authError,
              name: 'Sign Up: Invalid response from identity tiktok/access_token',
              additionalInfo: {
                code,
                hasError,
                errorMessage
              },
              tags: {
                socialMedia: 'tiktok'
              },
              feature: Feature.SignUp
            })
            return reject(
              new Error(response.status + ' ' + (await response.text()))
            )
          }

          const {
            data: { access_token, open_id, expires_in }
          } = await response.json()

          track(
            make({
              eventName: EventNames.TIKTOK_COMPLETE_OAUTH
            })
          )

          authDone = true
          return resolve({
            accessToken: access_token,
            openId: open_id,
            expiresIn: expires_in
          })
        } catch (e) {
          reportToSentry({
            error: e as Error,
            name: 'Sign Up: Unknown TikTok Auth Error',
            additionalInfo: {
              code,
              hasError,
              errorMessage
            },
            tags: {
              socialMedia: 'tiktok'
            },
            feature: Feature.SignUp
          })
          return reject(e)
        }
      }

      // Needed for Android
      const listener = tikTokEvents.addListener('onAuthCompleted', (resp) => {
        listener?.remove()
        handleTikTokAuth(resp.code, !!resp.status, resp.status)
      })

      tikTokAuth(handleTikTokAuth)
    })
  }

export const useTikTokAuth = (args: UseTikTokAuthArguments) => {
  const { isEnabled: isTikTokNativeAuthEnabled } = useFeatureFlag(
    FeatureFlags.TIKTOK_NATIVE_AUTH
  )

  return createUseTikTokAuthHook({
    authenticate: createAuthenticate(!!isTikTokNativeAuthEnabled),
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
