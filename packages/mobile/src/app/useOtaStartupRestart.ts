/**
 * Auto-applies pending OTA updates on cold start.
 *
 * When the app is launched (including from a push notification tap), this hook
 * checks whether a CodePush update was downloaded in a previous session and is
 * waiting to be applied. If so, it restarts the JS bundle immediately — while
 * the native splash screen is still visible — so the user always launches into
 * the latest code.
 *
 * Push-notification deep links survive the restart because
 * `getInitialNotification()` is held at the native layer and persists across
 * JS-only CodePush restarts.
 */

import { useEffect, useRef } from 'react'

import CodePush from '@bravemobile/react-native-code-push'

import { isOtaEnabled } from './ota-updates'

export function useOtaStartupRestart() {
  const didRunRef = useRef(false)

  useEffect(() => {
    if (didRunRef.current || !isOtaEnabled()) return
    didRunRef.current = true

    ;(async () => {
      try {
        const pending = await CodePush.getUpdateMetadata(
          CodePush.UpdateState.PENDING
        )
        if (pending) {
          console.warn(
            `[OTA] Pending update on cold start — restarting (appVersion=${pending.appVersion})`
          )
          CodePush.allowRestart()
          CodePush.restartApp(true)
        }
      } catch (e) {
        console.warn('[OTA] Cold-start pending check failed', e)
      }
    })()
  }, [])
}
