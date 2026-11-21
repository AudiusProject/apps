import { EventEmitter } from 'events'

import type optimizely from '@optimizely/optimizely-sdk'

import { ID } from '~/models'
import { Nullable } from '~/utils'

import { Environment } from '../env'

import { remoteConfigIntDefaults, remoteConfigStringDefaults } from './defaults'
import {
  environmentFlagDefaults,
  FeatureFlags,
  flagDefaults
} from './feature-flags'
import { IntKeys, StringKeys, AllRemoteConfigKeys } from './types'

const REMOTE_CONFIG_FEATURE_KEY = 'remote_config'

type State = {
  didInitialize: boolean
  didInitializeUser: boolean
  id: Nullable<number>
}

type MobileClientInfo = {
  mobilePlatform: 'ios' | 'android' | 'web' | 'windows' | 'macos'
  mobileAppVersion: string
  otaVersion?: string
}

export type RemoteConfigOptions<Client> = {
  createOptimizelyClient: () => Promise<Client>
  getFeatureFlagSessionId: () => Promise<Nullable<number>>
  setFeatureFlagSessionId: (id: number) => Promise<void>
  setLogLevel: () => void
  environment: Environment
  appVersion: string
  platform: 'web' | 'mobile' | 'desktop'
  getMobileClientInfo?: () => Promise<MobileClientInfo> | MobileClientInfo
}

export const remoteConfig = <
  Client extends Pick<
    optimizely.Client,
    | 'getFeatureVariableInteger'
    | 'getFeatureVariableString'
    | 'isFeatureEnabled'
    | 'onReady'
  >
>({
  createOptimizelyClient,
  getFeatureFlagSessionId,
  setFeatureFlagSessionId,
  setLogLevel,
  environment,
  appVersion,
  platform,
  getMobileClientInfo
}: RemoteConfigOptions<Client>) => {
  const state: State = {
    didInitialize: false,
    didInitializeUser: false,
    id: null
  }

  setLogLevel()

  let client: Client | undefined

  let mobileClientInfo: MobileClientInfo | undefined

  const emitter = new EventEmitter()
  emitter.setMaxListeners(1000)

  async function init() {
    const savedSessionId = await getFeatureFlagSessionId()
    if (!savedSessionId) {
      const newSessionId = generateSessionId()
      setFeatureFlagSessionId(newSessionId)
      state.id = newSessionId
    } else {
      state.id = savedSessionId
    }
    mobileClientInfo = getMobileClientInfo
      ? await getMobileClientInfo()
      : undefined
    client = await createOptimizelyClient()

    client.onReady().then(() => {
      state.didInitialize = true
      emitter.emit('init')
    })
  }

  function onClientReady(cb: () => void) {
    if (state.didInitialize) {
      cb()
    } else {
      const handler = () => {
        cb()
        emitter.removeListener('init', handler)
      }

      emitter.addListener('init', handler)
    }
  }

  function onUserReady(cb: () => void) {
    if (state.didInitializeUser) {
      cb()
    } else {
      const handler = () => {
        cb()
        unlistenForUserId(handler)
      }
      listenForUserId(handler)
    }
  }

  function setUserId(userId: ID) {
    state.id = userId
    state.didInitializeUser = true
    emitter.emit('setUserId')
  }

  function listenForUserId(cb: () => void | Promise<void>) {
    emitter.addListener('setUserId', cb)
  }

  function unlistenForUserId(cb: () => void | Promise<void>) {
    emitter.removeListener('setUserId', cb)
  }

  function getRemoteVar(key: StringKeys): string | null
  function getRemoteVar(key: IntKeys): number | null
  function getRemoteVar(key: AllRemoteConfigKeys): number | string | null
  function getRemoteVar(key: AllRemoteConfigKeys): number | string | null {
    if (!client || !state.id) return null

    const id = state.id

    if (isIntKey(key)) {
      return getValue(
        remoteConfigIntDefaults,
        key,
        id,
        client.getFeatureVariableInteger.bind(client)
      )
    }

    return getValue(
      remoteConfigStringDefaults,
      key,
      id,
      client.getFeatureVariableString.bind(client)
    )
  }

  function getFeatureEnabled(flag: FeatureFlags, fallbackFlag?: FeatureFlags) {
    const defaultVal =
      environmentFlagDefaults[environment][flag] ?? flagDefaults[flag]

    if (!client || !state.id) return defaultVal

    const id = state.id

    const isFeatureEnabled = (f: FeatureFlags) => {
      if (!client) {
        return defaultVal
      }

      return client.isFeatureEnabled(f, id.toString(), {
        userId: id,
        appVersion,
        platform,
        mobilePlatform: mobileClientInfo?.mobilePlatform ?? null,
        mobileAppVersion: mobileClientInfo?.mobileAppVersion ?? null,
        otaVersion: mobileClientInfo?.otaVersion ?? null
        // Note: this actually returns `undefined` if optimizely data has not been requested
      }) as boolean | undefined
    }

    try {
      if (state.didInitialize) {
        return (
          (isFeatureEnabled(flag) ||
            (fallbackFlag && isFeatureEnabled(fallbackFlag))) ??
          defaultVal
        )
      }
      return defaultVal
    } catch (err) {
      return defaultVal
    }
  }

  const waitForRemoteConfig = async () => {
    await new Promise<void>(onClientReady)
  }

  const waitForUserRemoteConfig = async () => {
    await new Promise<void>(onUserReady)
  }

  function isIntKey(key: AllRemoteConfigKeys): key is IntKeys {
    return !!Object.values(IntKeys).find((x) => x === key)
  }

  function getValue<T>(
    defaults: { [id: string]: T },
    varKey: string,
    userId: number,
    getFn: (
      featureKey: string,
      variableKey: string,
      userId: string,
      attributes?: { [key: string]: string | number | boolean }
    ) => T | null
  ): T {
    const defaultVal = defaults[varKey]
    if (!state.didInitialize) return defaultVal
    return (
      getFn(REMOTE_CONFIG_FEATURE_KEY, varKey, userId.toString(), {
        userId
      }) ?? defaultVal
    )
  }

  return {
    getFeatureEnabled,
    getRemoteVar,
    getPlatform: () => platform,
    init,
    setUserId,
    waitForRemoteConfig,
    waitForUserRemoteConfig,
    listenForUserId,
    unlistenForUserId
  }

  function generateSessionId() {
    return Math.floor(Math.random() * Number.MIN_SAFE_INTEGER)
  }
}

export type RemoteConfigInstance = ReturnType<typeof remoteConfig>
