/**
 * Full SDK entry point for React Native — includes everything from the full
 * barrel plus native-specific defaults (AsyncStorage, expo-web-browser).
 *
 * Internal React Native consumers should import from '@audius/sdk/full'.
 */
import type { AudiusSdk } from './sdk'
import { createSdk } from './sdk/createSdk'
import { TokenStoreAsyncStorage } from './sdk/oauth/TokenStoreAsyncStorage'
import type { SdkConfig } from './sdk/types'

export * from './sdk'

export const sdk = (config: SdkConfig): AudiusSdk => {
  const tokenStore = new TokenStoreAsyncStorage()

  // eslint-disable-next-line prefer-const
  let sdkInstance!: AudiusSdk

  const defaultOpenUrl = async (url: string) => {
    let WebBrowser: any
    try {
      WebBrowser = require('expo-web-browser')
    } catch (error) {
      const message =
        'Failed to load "expo-web-browser". Please add "expo-web-browser" to your project dependencies to enable mobile login.' +
        (error instanceof Error && error.message
          ? ` Original error: ${error.message}`
          : '')
      throw new Error(message)
    }

    let redirectUri: string | undefined
    try {
      redirectUri = new URL(url).searchParams.get('redirect_uri') ?? undefined
    } catch {}

    const result = await WebBrowser.openAuthSessionAsync(url, redirectUri)
    if (result.type === 'success') {
      await sdkInstance.oauth.handleRedirect(result.url)
    } else if (result.type === 'locked') {
      throw new Error('Another authentication session is already in progress.')
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
