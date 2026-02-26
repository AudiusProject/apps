import { EventEmitter } from 'events'

import optimizely from '@optimizely/optimizely-sdk'

import { ID } from '~/models'
import { Nullable } from '~/utils'

import { Environment } from '../env'

import {
  remoteConfigIntDefaults,
  remoteConfigStringDefaults,
  remoteConfigDoubleDefaults,
  remoteConfigBooleanDefaults
} from './defaults'
import {
  environmentFlagDefaults,
  FeatureFlags,
  flagDefaults
} from './feature-flags'
import {
  IntKeys,
  StringKeys,
  DoubleKeys,
  BooleanKeys,
  AllRemoteConfigKeys
} from './types'

// Constants
// All optimizely feature keys are lowercase_snake
const REMOTE_CONFIG_FEATURE_KEY = 'remote_config'

// Internal State
type State = {
  didInitialize: boolean
  didInitializeUser: boolean
  id: Nullable<number>
}

type MobileClientInfo = {
  /** This is the type of Platform.OS, but we only expect ios or android here */
  mobilePlatform: 'ios' | 'android' | 'web' | 'windows' | 'macos'
  mobileAppVersion: string
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
    | 'getFeatureVariableBoolean'
    | 'getFeatureVariableDouble'
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

  // Optimizely client
  let client: Client | undefined

  /** Mobile app info if platform is mobile */
  let mobileClientInfo: MobileClientInfo | undefined

  const emitter = new EventEmitter()
  emitter.setMaxListeners(1000)

  async function init() {
    // Set sessionId for feature flag bucketing
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

  /**
   * Register a callback for client ready.
   */
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

  /**
   * Register a callback for user ready.
   */
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

  // API

  /**
   * Set the userId for calls to Optimizely.
   * Prior to calling, uses session ID
   */
  function setUserId(userId: ID) {
    state.id = userId
    state.didInitializeUser = true
    emitter.emit('setUserId')
  }

  /**
   * API for listening to setUser events
   */
  function listenForUserId(cb: () => void | Promise<void>) {
    emitter.addListener('setUserId', cb)
  }

  /**
   * API to unlisten to setUser events
   */
  function unlistenForUserId(cb: () => void | Promise<void>) {
    emitter.removeListener('setUserId', cb)
  }

  /**
   * Access a remotely configured value.
   */
  function getRemoteVar(key: StringKeys): string | null
  function getRemoteVar(key: BooleanKeys): boolean | null
  function getRemoteVar(key: IntKeys): number | null
  function getRemoteVar(key: DoubleKeys): number | null
  function getRemoteVar(
    key: AllRemoteConfigKeys
  ): number | string | boolean | null
  function getRemoteVar(
    key: AllRemoteConfigKeys
  ): number | string | boolean | null {
    // If the client is not ready yet, return early with `null`
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

    if (isStringKey(key)) {
      return getValue(
        remoteConfigStringDefaults,
        key,
        id,
        client.getFeatureVariableString.bind(client)
      )
    }

    if (isDoubleKey(key)) {
      return getValue(
        remoteConfigDoubleDefaults,
        key,
        id,
        client.getFeatureVariableDouble.bind(client)
      )
    }

    return getValue(
      remoteConfigBooleanDefaults,
      key,
      id,
      client.getFeatureVariableBoolean.bind(client)
    )
  }

  /**
   * Gets whether a given feature flag is enabled.
   * Accepts a fallback flag which will be checked if the primary flag is disabled
   */
  function getFeatureEnabled(flag: FeatureFlags, fallbackFlag?: FeatureFlags) {
    const defaultVal =
      environmentFlagDefaults[environment][flag] ?? flagDefaults[flag]

    // If the client is not ready yet, return early with `null`
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
        mobileAppVersion: mobileClientInfo?.mobileAppVersion ?? null
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

  /**
   * Need this function for feature flags that depend on user id.
   * This is because the waitForRemoteConfig does not ensure that
   * user id is available before its promise resolution, meaning
   * that it will sometimes fallback to the session id
   * that is set during initialization
   */
  const waitForUserRemoteConfig = async () => {
    await new Promise<void>(onUserReady)
  }

  // Type predicates
  function isIntKey(key: AllRemoteConfigKeys): key is IntKeys {
    return !!Object.values(IntKeys).find((x) => x === key)
  }
  function isStringKey(key: AllRemoteConfigKeys): key is StringKeys {
    return !!Object.values(StringKeys).find((x) => x === key)
  }
  function isDoubleKey(key: AllRemoteConfigKeys): key is DoubleKeys {
    return !!Object.values(DoubleKeys).find((x) => x === key)
  }

  // Removes some boilerplate around getting values, falling back to defaults,
  // calling the correct client fn.
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
    init,
    setUserId,
    waitForRemoteConfig,
    waitForUserRemoteConfig,
    listenForUserId,
    unlistenForUserId
  }

  // Generate negative ints for session IDs
  function generateSessionId() {
    return Math.floor(Math.random() * Number.MIN_SAFE_INTEGER)
  }
}

export type RemoteConfigInstance = ReturnType<typeof remoteConfig>
