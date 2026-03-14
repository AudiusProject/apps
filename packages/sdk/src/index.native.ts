import * as WebBrowser from 'expo-web-browser'

import type { AudiusSdk } from './sdk'
import { createSdk } from './sdk/createSdk'
import { TokenStoreAsyncStorage } from './sdk/oauth/TokenStoreAsyncStorage'
import type { SdkConfig } from './sdk/types'

export * from './sdk'

const tokenStore = new TokenStoreAsyncStorage()

/**
 * Creates the Audius SDK configured for React Native / Expo.
 *
 * Defaults:
 * - `tokenStore`: AsyncStorage-backed (tokens survive app restarts)
 * - `openUrl`: `expo-web-browser` openAuthSessionAsync, which opens an
 *   isolated ASWebAuthenticationSession (iOS) / Chrome Custom Tab (Android).
 *   This bypasses OS universal-link interception so the Audius native app
 *   never intercepts the OAuth consent page, and the redirect URL is returned
 *   directly to the SDK without relying on a Linking deep-link event.
 */
export const sdk = (config: SdkConfig): AudiusSdk => {
  // Declared with definite-assignment assertion — assigned immediately below,
  // before defaultOpenUrl can ever be invoked (login() is called after sdk() returns).
  // eslint-disable-next-line prefer-const
  let sdkInstance!: AudiusSdk

  const defaultOpenUrl = async (url: string) => {
    let redirectUri: string | undefined
    try {
      redirectUri = new URL(url).searchParams.get('redirect_uri') ?? undefined
    } catch {}

    const result = await WebBrowser.openAuthSessionAsync(url, redirectUri)
    if (result.type === 'success') {
      await sdkInstance.oauth.handleRedirect(result.url)
    } else {
      throw new Error('Login cancelled.')
    }
  }

  sdkInstance = createSdk({
    ...config,
    services: {
      ...config.services,
      tokenStore: config.services?.tokenStore ?? tokenStore,
      openUrl: config.services?.openUrl ?? defaultOpenUrl
    }
  })

  return sdkInstance
}
