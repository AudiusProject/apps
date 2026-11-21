import { call } from 'typed-redux-saga'

import { getContext } from '../store'

import { AudiusBackend } from './audius-backend'
import { LocalStorage } from './local-storage'

export type Location = {
  asn: string
  city: string
  continent_code: string
  country: string
  country_calling_code: string
  country_code: string
  country_name: string
  currency: string
  is_eu: boolean
  ip: string
  languages: string
  latitude: number
  longitude: number
  org: string
  postal: string
  region: string
  region_code: string
  timezone: string
  utc_offset: string
}

const LOCATION_CACHE_KEY = 'LAST_LOCATION'
const LOCATION_CACHE_DURATION = 2 * 24 * 3600

export const getLocation = async (
  localStorage: LocalStorage,
  audiusBackend: AudiusBackend
): Promise<Location | null> => {
  try {
    const cachedLocation: Location | null =
      await localStorage.getExpiringJSONValue(LOCATION_CACHE_KEY)
    if (cachedLocation) {
      return cachedLocation
    }

    const identityServiceUrl = audiusBackend.identityServiceUrl
    const res = await fetch(`${identityServiceUrl}/location`)
    const json: Location | { error: boolean; reason: string } = await res.json()
    if ('error' in json) {
      throw new Error(json.reason)
    }
    localStorage.setExpiringJSONValue(
      LOCATION_CACHE_KEY,
      json,
      LOCATION_CACHE_DURATION
    )
    return json
  } catch (e) {
    console.error(
      `Got error during getLocation call: ${e} | Error message is: ${
        (e as any)?.message ?? null
      }`
    )
    return null
  }
}

export function* getCityAndRegion() {
  const localStorage = yield* getContext('localStorage')
  const audiusBackend = yield* getContext('audiusBackendInstance')
  const location = yield* call(getLocation, localStorage, audiusBackend)
  if (!location) return null

  if (location.city && location.region_code) {
    return `${location.city}, ${location.region_code}`
  }
  if (location.city) {
    return `${location.city}`
  }
  return null
}
