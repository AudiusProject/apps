import {
  init as amplitudeInit,
  track as amplitudeTrack,
  setUserId,
  identify as amplitudeIdentify,
  Identify,
  Types as AmplitudeTypes
} from '@amplitude/analytics-react-native'
import type { IdentifyTraits } from '@audius/common/models'
import AsyncStorage from '@react-native-async-storage/async-storage'
import VersionNumber from 'react-native-version-number'

import { env } from 'app/services/env'

import packageInfo from '../../package.json'
import type { Track, Screen, AllEvents } from '../types/analytics'
import { EventNames } from '../types/analytics'

const { version: clientVersion } = packageInfo

let analyticsSetupStatus: 'ready' | 'pending' | 'error' = 'pending'

const AmplitudeWriteKey = env.AMPLITUDE_API_KEY
const AmplitudeProxy = env.AMPLITUDE_PROXY
const IS_PRODUCTION_BUILD = process.env.NODE_ENV === 'production'

const IDENTIFY_TRAITS_KEY = 'amplitude:identifiedTraits'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export const init = async () => {
  try {
    if (AmplitudeWriteKey && AmplitudeProxy) {
      await amplitudeInit(AmplitudeWriteKey, undefined, {
        serverUrl: AmplitudeProxy,
        appVersion: clientVersion, // Identifies our app version to Amplitude
        logLevel: AmplitudeTypes.LogLevel.Error,
        // Events queued in memory will flush when number of events exceed upload threshold
        // Default value is 30
        flushQueueSize: 50,
        // Events queue will flush every certain milliseconds based on setting
        // Default value is 10000 milliseconds
        flushIntervalMillis: 20000,
        minIdLength: 1 // By default amplitude rejects our handle ids if they're less than 5 characters
      })
      analyticsSetupStatus = 'ready'
    } else {
      analyticsSetupStatus = 'error'
      console.error(
        'Analytics unable to setup: missing amplitude write key or proxy url'
      )
    }
  } catch (err) {
    analyticsSetupStatus = 'error'
    console.error(`Amplitude error: ${err}`)
  }
}

const isAudiusSetup = async () => {
  if (analyticsSetupStatus === 'pending') {
    const ready = await new Promise((resolve, reject) => {
      const checkStatusInterval = setInterval(() => {
        if (analyticsSetupStatus === 'pending') return
        clearInterval(checkStatusInterval)
        if (analyticsSetupStatus === 'ready') resolve(true)
        resolve(false)
      }, 500)
    })
    return ready
  } else if (analyticsSetupStatus === 'ready') return true
  else {
    return false
  }
}

export const make = (event: AllEvents) => {
  const { eventName, ...props } = event
  return {
    eventName,
    properties: props as any
  }
}

// Identify User
export const identify = async (traits: IdentifyTraits) => {
  const isSetup = await isAudiusSetup()
  if (!isSetup) return

  if (traits.handle) {
    setUserId(traits.handle)
  }

  // User properties persist in Amplitude, so skip an identify that would set
  // the same values again (it runs on every account load). Resend weekly in
  // case an earlier one was dropped.
  const serializedTraits = JSON.stringify([
    Math.floor(Date.now() / WEEK_MS),
    Object.keys(traits)
      .sort()
      .map((k) => [k, traits[k as keyof IdentifyTraits]])
  ])
  const previousTraits = await AsyncStorage.getItem(IDENTIFY_TRAITS_KEY).catch(
    () => null
  )
  if (previousTraits === serializedTraits) return

  const identifyObj = new Identify()
  Object.entries(traits).forEach(([key, value]) => {
    identifyObj.set(key, value)
  })
  await amplitudeIdentify(identifyObj)
  await AsyncStorage.setItem(IDENTIFY_TRAITS_KEY, serializedTraits).catch(
    () => {}
  )
}

// Track Event
export const track = async ({ eventName, properties }: Track) => {
  const isSetup = await isAudiusSetup()
  if (!isSetup) return
  const version = VersionNumber.appVersion
  const propertiesWithContext = {
    ...properties,
    clientVersion,
    isNativeMobile: true,
    mobileClientVersion: version
  }
  if (!IS_PRODUCTION_BUILD) {
    console.info('Amplitude | track', eventName, properties)
  }
  await amplitudeTrack(eventName, propertiesWithContext)
}

// Screen Event
export const screen = async ({ route, properties = {} }: Screen) => {
  const isSetup = await isAudiusSetup()
  if (!isSetup) return
  await amplitudeTrack(EventNames.PAGE_VIEW, { route, ...properties })
}
