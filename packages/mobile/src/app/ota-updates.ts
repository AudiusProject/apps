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

import packageJson from '../../package.json'

const OTA_BASE_URL =
  (Config as { OTA_UPDATE_URL?: string }).OTA_UPDATE_URL ?? ''

/** Same version CI uses for `--binary-version` (packages/mobile/package.json). */
const PACKAGE_JSON_APP_VERSION = packageJson.version

let loggedBootstrapOnce = false

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
  nativeAppVersionLast: string | null
  historyAppVersion: string | null
  updatedAtMs: number
}

let historyFetchDiag: OtaHistoryFetchDiagnostics = {
  lastUrl: null,
  lastOutcome: 'none',
  lastHttpStatus: null,
  lastEntryCount: null,
  lastError: null,
  nativeAppVersionLast: null,
  historyAppVersion: null,
  updatedAtMs: 0
}

function patchDiag(p: Partial<OtaHistoryFetchDiagnostics>) {
  historyFetchDiag = { ...historyFetchDiag, ...p, updatedAtMs: Date.now() }
}

export function getOtaHistoryFetchDiagnostics(): OtaHistoryFetchDiagnostics {
  return { ...historyFetchDiag }
}

/** Last release-history URL fetched this session (for sync / banner logs). */
export function getOtaLastHistoryEndpointForLogs(): string {
  const u = historyFetchDiag.lastUrl
  return u != null && u.length > 0
    ? u
    : '(no release history fetch yet this session)'
}

export function getOtaBuildConfigForDiagnostics(): {
  enabled: boolean
  baseUrl: string
  channel: string
  packageJsonAppVersion: string
} {
  const channel =
    (Config as { OTA_CHANNEL?: string }).OTA_CHANNEL ?? 'production'
  const raw = OTA_BASE_URL.trim()
  return {
    enabled: raw.length > 0,
    baseUrl: raw.length > 0 ? raw.replace(/\/$/, '') : '(unset)',
    channel,
    packageJsonAppVersion: PACKAGE_JSON_APP_VERSION
  }
}

export function isOtaEnabled(): boolean {
  return OTA_BASE_URL.length > 0
}

/**
 * CodePush always resolves a "latest" enabled release from history. An empty object
 * throws `There is no latest release.` — handled internally but still `console.error`'d.
 * One synthetic release with an empty `downloadUrl` makes the library treat the check
 * as "no update" without throwing.
 */
function releaseHistoryNoUpdatePlaceholder(
  historyAppVersion: string
): ReleaseHistoryInterface {
  return {
    [historyAppVersion]: {
      enabled: true,
      mandatory: false,
      downloadUrl: '',
      packageHash: ''
    }
  }
}

function asReleaseHistory(value: unknown): ReleaseHistoryInterface {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as ReleaseHistoryInterface
  }
  return {}
}

function countEnabledReleases(history: ReleaseHistoryInterface): number {
  let n = 0
  for (const bundle of Object.values(history)) {
    if (bundle?.enabled === true) {
      n++
    }
  }
  return n
}

/**
 * History URL: `{base}/histories/{platform}/{channel}/{package.json version}.json`
 * (matches CI binary version, not necessarily native CFBundleShortVersionString / versionName.)
 */
export async function releaseHistoryFetcher(
  updateRequest: UpdateCheckRequest
): Promise<ReleaseHistoryInterface> {
  if (!OTA_BASE_URL) {
    patchDiag({
      lastUrl: null,
      lastOutcome: 'none',
      lastHttpStatus: null,
      lastEntryCount: null,
      lastError: 'OTA_UPDATE_URL unset',
      nativeAppVersionLast: null,
      historyAppVersion: null
    })
    return {}
  }

  const platform = Platform.OS as 'ios' | 'android'
  const identifier =
    (Config as { OTA_CHANNEL?: string }).OTA_CHANNEL ?? 'production'
  const nativeAppVersion = updateRequest.app_version
  const historyAppVersion = PACKAGE_JSON_APP_VERSION
  const baseUrl = OTA_BASE_URL.replace(/\/$/, '')
  const url = `${baseUrl}/histories/${platform}/${identifier}/${historyAppVersion}.json`

  if (!loggedBootstrapOnce) {
    loggedBootstrapOnce = true
    console.warn(
      `[OTA] bootstrap baseUrl=${baseUrl} channel=${identifier} packageJsonVersion=${historyAppVersion} nativeAppVersion=${nativeAppVersion} historyEndpoint=${url}`
    )
    if (nativeAppVersion !== historyAppVersion) {
      console.warn(
        `[OTA] native app_version !== package.json; history path uses packageJsonVersion (see historyEndpoint)`
      )
    }
  }

  console.warn(`[OTA] Release history request endpoint=${url}`)

  try {
    const res = await fetch(url, { method: 'GET' })

    if (!res.ok) {
      console.warn(
        `[OTA] Release history HTTP status=${res.status} endpoint=${url} (using no-update placeholder so CodePush does not throw)`
      )
      patchDiag({
        lastUrl: url,
        lastOutcome: 'http_error',
        lastHttpStatus: res.status,
        lastEntryCount: null,
        lastError: null,
        nativeAppVersionLast: nativeAppVersion,
        historyAppVersion
      })
      return releaseHistoryNoUpdatePlaceholder(historyAppVersion)
    }

    const data = asReleaseHistory(await res.json())
    const entryCount = Object.keys(data).length
    const enabledCount = countEnabledReleases(data)

    if (entryCount === 0 || enabledCount === 0) {
      const reason =
        entryCount === 0
          ? 'empty JSON'
          : 'no enabled releases (all disabled or malformed)'
      console.warn(
        `[OTA] Release history ${reason} endpoint=${url} (using no-update placeholder; no CodePush error)`
      )
      patchDiag({
        lastUrl: url,
        lastOutcome: 'empty_json',
        lastHttpStatus: res.status,
        lastEntryCount: entryCount,
        lastError: null,
        nativeAppVersionLast: nativeAppVersion,
        historyAppVersion
      })
      return releaseHistoryNoUpdatePlaceholder(historyAppVersion)
    }

    patchDiag({
      lastUrl: url,
      lastOutcome: 'success',
      lastHttpStatus: res.status,
      lastEntryCount: entryCount,
      lastError: null,
      nativeAppVersionLast: nativeAppVersion,
      historyAppVersion
    })
    console.warn(
      `[OTA] Release history OK endpoint=${url} entries=${entryCount} http=${res.status}`
    )
    return data
  } catch (e) {
    console.warn(
      `[OTA] Release history fetch failed endpoint=${url} (using no-update placeholder so CodePush does not throw)`,
      e
    )
    patchDiag({
      lastUrl: url,
      lastOutcome: 'network_error',
      lastHttpStatus: null,
      lastEntryCount: null,
      lastError: e instanceof Error ? e.message : String(e),
      nativeAppVersionLast: nativeAppVersion,
      historyAppVersion
    })
    return releaseHistoryNoUpdatePlaceholder(historyAppVersion)
  }
}
