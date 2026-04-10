/**
 * Downloads and applies OTA updates on cold start.
 *
 * On every app launch (including from a push notification tap):
 * 1. If a previously-downloaded update is pending → restart immediately
 * 2. Otherwise, sync with the server to check/download/install a new update.
 *    If the sync completes within a timeout window (while the splash screen is
 *    still visible), restart to apply it. If it takes too long, the update is
 *    staged as pending and will be applied on the next cold start (or via the
 *    banner's Restart button).
 *
 * Push-notification deep links survive the restart because
 * `getInitialNotification()` is held at the native layer and persists across
 * JS-only CodePush restarts.
 */

import { useEffect, useRef } from 'react'

import CodePush from '@bravemobile/react-native-code-push'

import { isOtaEnabled } from './ota-updates'

/** Max time (ms) to wait for an OTA download before giving up and loading normally. */
const OTA_STARTUP_TIMEOUT_MS = 10_000

export function useOtaStartupRestart() {
  const didRunRef = useRef(false)

  useEffect(() => {
    if (didRunRef.current || !isOtaEnabled()) return
    didRunRef.current = true

    let expired = false
    const timer = setTimeout(() => {
      expired = true
      console.warn(
        `[OTA] Cold-start sync exceeded ${OTA_STARTUP_TIMEOUT_MS}ms — update will apply on next restart`
      )
    }, OTA_STARTUP_TIMEOUT_MS)

    ;(async () => {
      try {
        // 1. Check for an already-downloaded pending update (instant, no network)
        const pending = await CodePush.getUpdateMetadata(
          CodePush.UpdateState.PENDING
        )
        if (pending) {
          clearTimeout(timer)
          console.warn(
            `[OTA] Pending update on cold start — restarting (appVersion=${pending.appVersion})`
          )
          CodePush.allowRestart()
          CodePush.restartApp(true)
          return
        }

        // 2. No pending update — sync to check/download/install new updates.
        //    Use ON_NEXT_RESTART so CodePush doesn't auto-restart at an
        //    unpredictable time; we control the restart timing below.
        const status = await CodePush.sync(
          {
            installMode: CodePush.InstallMode.ON_NEXT_RESTART,
            mandatoryInstallMode: CodePush.InstallMode.ON_NEXT_RESTART
          },
          (syncStatus) => {
            if (
              syncStatus !== CodePush.SyncStatus.UP_TO_DATE &&
              syncStatus !== CodePush.SyncStatus.SYNC_IN_PROGRESS
            ) {
              console.warn(
                `[OTA] Cold-start sync status: ${syncStatus}`
              )
            }
          }
        )

        clearTimeout(timer)

        // 3. If the update was downloaded+installed before the timeout,
        //    restart now (splash screen should still be visible).
        if (status === CodePush.SyncStatus.UPDATE_INSTALLED && !expired) {
          console.warn(
            '[OTA] Update installed on cold start within timeout — restarting'
          )
          CodePush.allowRestart()
          CodePush.restartApp(true)
        }
      } catch (e) {
        clearTimeout(timer)
        console.warn('[OTA] Cold-start sync failed', e)
      }
    })()

    return () => clearTimeout(timer)
  }, [])
}
