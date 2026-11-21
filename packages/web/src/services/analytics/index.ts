import {
  AnalyticsEvent,
  AllTrackingEvents,
  IdentifyTraits
} from '@audius/common/models'
import { Nullable } from '@audius/common/utils'

import { env } from 'services/env'
import { remoteConfigInstance } from 'services/remote-config/remote-config-instance'

import packageInfo from '../../../package.json'

import * as amplitude from './amplitude'
const { version } = packageInfo

const IS_PRODUCTION_BUILD = env.ENVIRONMENT === 'production'

let resolveCallback: Nullable<(value?: any) => void> = null
let rejectCallback: Nullable<(value?: any) => void> = null
const didInit = new Promise((resolve, reject) => {
  resolveCallback = resolve
  rejectCallback = reject
})

export const init = async (isMobile: boolean) => {
  try {
    await remoteConfigInstance.waitForRemoteConfig()
    await amplitude.init(isMobile)
    if (resolveCallback) {
      resolveCallback()
    }
  } catch (err) {
    console.error(err)
    if (rejectCallback) {
      rejectCallback(err)
    }
  }
}

let trackCounter = 0

const TRACK_LIMIT = 10000

export const track = async (
  { eventName, properties }: AnalyticsEvent,
  callback?: () => void
) => {
  try {
    if (!IS_PRODUCTION_BUILD) {
      console.info(`Amplitude | track`, eventName, properties)
    }
    if (trackCounter++ >= TRACK_LIMIT) return

    const propertiesWithContext = {
      ...properties,
      clientVersion: version
    }

    await didInit
    return await amplitude.track(eventName, propertiesWithContext, callback)
  } catch (err) {
    console.error(err)
  }
}

export const identify = async (
  traits?: IdentifyTraits,
  options?: Record<string, any>,
  callback?: () => void
) => {
  try {
    if (!IS_PRODUCTION_BUILD) {
      console.info('Amplitude | identify', { traits, options })
    }
    if (!traits) {
      return
    }
    await didInit
    return await amplitude.identify(traits, callback)
  } catch (err) {
    console.error(err)
  }
}

export const make = (event: AllTrackingEvents) => {
  const { eventName, ...props } = event
  return {
    eventName,
    properties: props as any
  }
}
