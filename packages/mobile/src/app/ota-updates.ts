/**
 * Over-the-air (OTA) update configuration using CodePush.
 * Set OTA_UPDATE_URL in .env (e.g. https://your-cdn.com/codepush) to enable.
 * When unset, no update checks are performed.
 */

import type {
  ReleaseHistoryInterface,
  UpdateCheckRequest
} from '@bravemobile/react-native-code-push'
import { Platform } from 'react-native'
import Config from 'react-native-config'

const OTA_BASE_URL =
  (Config as { OTA_UPDATE_URL?: string }).OTA_UPDATE_URL ?? ''

let loggedOtaConfigOnce = false

export type OtaHistoryFetchDiagnostics = {
  lastUrl: string | null
  lastOutcome:
    | 'none'
    | 'success'
    | 'http_error'
    | 'network_error'
    | 'empty_json'
  lastHttpStatus: number | null
  lastEntryCount: number | null
  lastError: string | null
  updatedAtMs: number
}

const initialHistoryFetchDiag: OtaHistoryFetchDiagnostics = {
  lastUrl: null,
  lastOutcome: 'none',
  lastHttpStatus: null,
  lastEntryCount: null,
  lastError: null,
  updatedAtMs: 0
}

let historyFetchDiag: OtaHistoryFetchDiagnostics = {
  ...initialHistoryFetchDiag
}

function patchHistoryFetchDiag(patch: Partial<OtaHistoryFetchDiagnostics>) {
  historyFetchDiag = {
    ...historyFetchDiag,
    ...patch,
    updatedAtMs: Date.now()
  }
}

export function getOtaHistoryFetchDiagnostics(): OtaHistoryFetchDiagnostics {
  return { ...historyFetchDiag }
}

/** Baked-in OTA config from env (for About / debug UI). */
export function getOtaBuildConfigForDiagnostics(): {
  enabled: boolean
  baseUrl: string
  channel: string
} {
  const channel =
    (Config as { OTA_CHANNEL?: string }).OTA_CHANNEL ?? 'production'
  const raw = OTA_BASE_URL.trim()
  return {
    enabled: raw.length > 0,
    baseUrl: raw.length > 0 ? raw.replace(/\/$/, '') : '(unset)',
    channel
  }
}

export function isOtaEnabled(): boolean {
  return OTA_BASE_URL.length > 0
}

/**
 * Fetches release history for the current app version from your OTA server.
 * The server should host JSON at: {baseUrl}/histories/{platform}/{identifier}/{appVersion}.json
 * See code-push.config.ts and OTA_UPDATES.md for publishing and hosting.
 */
export async function releaseHistoryFetcher(
  updateRequest: UpdateCheckRequest
): Promise<ReleaseHistoryInterface> {
  if (!OTA_BASE_URL) {
    patchHistoryFetchDiag({
      lastUrl: null,
      lastOutcome: 'none',
      lastHttpStatus: null,
      lastEntryCount: null,
      lastError: 'OTA_UPDATE_URL unset'
    })
    return {}
  }
  const platform = Platform.OS as 'ios' | 'android'
  const identifier =
    (Config as { OTA_CHANNEL?: string }).OTA_CHANNEL ?? 'production'
  const appVersion = updateRequest.app_version
  const baseUrl = OTA_BASE_URL.replace(/\/$/, '')
  if (!loggedOtaConfigOnce) {
    loggedOtaConfigOnce = true
    console.warn(
      `[OTA] OTA_UPDATE_URL (resolved base)=${baseUrl} OTA_CHANNEL=${identifier}`
    )
  }
  const url = `${baseUrl}/histories/${platform}/${identifier}/${appVersion}.json`
  try {
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) {
      // console.log is stripped in release bundles; warn survives babel transform-remove-console (exclude: error, warn).
      console.warn(`[OTA] Release history HTTP ${res.status} url=${url}`)
      patchHistoryFetchDiag({
        lastUrl: url,
        lastOutcome: 'http_error',
        lastHttpStatus: res.status,
        lastEntryCount: null,
        lastError: null
      })
      return {}
    }
    const data = (await res.json()) as ReleaseHistoryInterface
    const entryCount = Object.keys(data).length
    if (entryCount === 0) {
      console.warn(`[OTA] Release history JSON has no entries url=${url}`)
      patchHistoryFetchDiag({
        lastUrl: url,
        lastOutcome: 'empty_json',
        lastHttpStatus: res.status,
        lastEntryCount: 0,
        lastError: null
      })
      return data
    }
    patchHistoryFetchDiag({
      lastUrl: url,
      lastOutcome: 'success',
      lastHttpStatus: res.status,
      lastEntryCount: entryCount,
      lastError: null
    })
    return data
  } catch (e) {
    console.warn(`[OTA] Release history fetch failed url=${url}`, e)
    patchHistoryFetchDiag({
      lastUrl: url,
      lastOutcome: 'network_error',
      lastHttpStatus: null,
      lastEntryCount: null,
      lastError: e instanceof Error ? e.message : String(e)
    })
    return {}
  }
}
