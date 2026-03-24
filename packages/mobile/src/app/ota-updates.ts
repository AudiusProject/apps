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
    return {}
  }
  const platform = Platform.OS as 'ios' | 'android'
  const identifier =
    (Config as { OTA_CHANNEL?: string }).OTA_CHANNEL ?? 'production'
  const appVersion = updateRequest.app_version
  const url = `${OTA_BASE_URL.replace(/\/$/, '')}/histories/${platform}/${identifier}/${appVersion}.json`
  try {
    const res = await fetch(url, { method: 'GET' })
    if (!res.ok) {
      return {}
    }
    const data = (await res.json()) as ReleaseHistoryInterface
    return data
  } catch {
    return {}
  }
}
