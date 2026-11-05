import { useCallback, useEffect, useRef, useState } from 'react'

import CodePush from '@bravemobile/react-native-code-push'
import { StyleSheet, View } from 'react-native'
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated'

import {
  Button,
  Flex,
  IconArrowRotate,
  IconButton,
  IconClose,
  Text
} from '@audius/harmony-native'
import {
  getOtaLastHistoryEndpointForLogs,
  isOtaEnabled
} from 'app/app/ota-updates'
import { useBottomBarInset } from 'app/components/core/BottomBarInsetContext'
import { GlassSurface } from 'app/components/core/Screen/GlassSurface'
import {
  isLiquidGlassAvailable,
  LiquidGlassView
} from 'app/components/core/Screen/LiquidGlass'
import { useEnterForeground } from 'app/hooks/useAppState'
import { useDrawer } from 'app/hooks/useDrawer'
import { isDarkTheme, useThemeVariant } from 'app/utils/theme'

/** Set to `true` to always show the toast for layout preview; use `false` in production. */
const FORCE_OTA_BANNER_PREVIEW = false

const TOAST_HEIGHT = 44
/** Gap between the toast and the play bar or tab bar below it. */
const TOAST_GAP = 12

const messages = {
  pendingBody: 'Update ready',
  restart: 'Restart',
  dismiss: 'Dismiss'
}

function syncStatusLabel(status: CodePush.SyncStatus): string {
  switch (status) {
    case CodePush.SyncStatus.CHECKING_FOR_UPDATE:
      return 'CHECKING_FOR_UPDATE'
    case CodePush.SyncStatus.DOWNLOADING_PACKAGE:
      return 'DOWNLOADING_PACKAGE'
    case CodePush.SyncStatus.INSTALLING_UPDATE:
      return 'INSTALLING_UPDATE'
    case CodePush.SyncStatus.UP_TO_DATE:
      return 'UP_TO_DATE'
    case CodePush.SyncStatus.UPDATE_INSTALLED:
      return 'UPDATE_INSTALLED'
    case CodePush.SyncStatus.SYNC_IN_PROGRESS:
      return 'SYNC_IN_PROGRESS'
    case CodePush.SyncStatus.UNKNOWN_ERROR:
      return 'UNKNOWN_ERROR'
    default:
      return `status_${status}`
  }
}

type BannerPhase = 'none' | 'pending'

/**
 * Poll for a pending package after mount/foreground. The download usually
 * takes tens of seconds and is done by ota-root's sync, not `prefetchUpdate`.
 */
const PENDING_POLL_INTERVAL_MS = 2000
const PENDING_POLL_WINDOW_MS = 3 * 60 * 1000

/**
 * CodePush is configured in ota-root (ON_APP_RESUME) to fetch updates with
 * ON_NEXT_RESTART. We only surface UI when an update is already downloaded
 * and installed as pending — then the user restarts when they want.
 *
 * Mounted once, beside the tab bar, as a small toast floating above the play
 * bar. It mounts during ota-root's sync and gets SYNC_IN_PROGRESS from its own
 * sync, so it detects the pending package by polling.
 */
export const OtaUpdateBanner = () => {
  const bottomInset = useBottomBarInset()
  const isDarkMode = isDarkTheme(useThemeVariant())
  const { isOpen: isNowPlayingOpen } = useDrawer('NowPlaying')
  const [phase, setPhase] = useState<BannerPhase>('none')
  const dismissedRef = useRef(false)
  const pendingLoggedRef = useRef(false)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Bumped on every stop/restart so an in-flight poll can't reschedule itself.
  const pollGenerationRef = useRef(0)

  /** Re-reads CodePush state; resolves to whether a pending package exists. */
  const refresh = useCallback(async (): Promise<boolean> => {
    if (!isOtaEnabled()) {
      if (!FORCE_OTA_BANNER_PREVIEW) {
        setPhase('none')
      } else {
        setPhase('pending')
      }
      return false
    }
    try {
      const pending = await CodePush.getUpdateMetadata(
        CodePush.UpdateState.PENDING
      )
      if (pending) {
        if (!dismissedRef.current && !pendingLoggedRef.current) {
          pendingLoggedRef.current = true
          console.warn(
            '[OTA] Pending CodePush package ready (show banner)',
            `lastHistoryEndpoint=${getOtaLastHistoryEndpointForLogs()}`
          )
        }
        setPhase(dismissedRef.current ? 'none' : 'pending')
        return true
      }
      pendingLoggedRef.current = false
      setPhase('none')
      return false
    } catch (e) {
      console.warn(
        '[OTA] getUpdateMetadata(PENDING) failed',
        e,
        `lastHistoryEndpoint=${getOtaLastHistoryEndpointForLogs()}`
      )
      setPhase('none')
      return false
    }
  }, [])

  const stopPendingPolls = useCallback(() => {
    pollGenerationRef.current += 1
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }
  }, [])

  // Poll until a pending package appears or the window closes.
  const schedulePendingPolls = useCallback(() => {
    stopPendingPolls()
    if (!isOtaEnabled()) {
      return
    }
    const generation = pollGenerationRef.current
    const startedAt = Date.now()
    const tick = () => {
      pollTimeoutRef.current = null
      refresh()
        .catch(() => false)
        .then((pending) => {
          if (
            generation !== pollGenerationRef.current ||
            pending ||
            Date.now() - startedAt >= PENDING_POLL_WINDOW_MS
          ) {
            return
          }
          pollTimeoutRef.current = setTimeout(tick, PENDING_POLL_INTERVAL_MS)
        })
    }
    tick()
  }, [refresh, stopPendingPolls])

  const prefetchUpdate = useCallback(async () => {
    if (!isOtaEnabled()) {
      return
    }
    try {
      const status = await CodePush.sync(
        {
          installMode: CodePush.InstallMode.ON_NEXT_RESTART,
          mandatoryInstallMode: CodePush.InstallMode.IMMEDIATE
        },
        (progress) => {
          const lastHistoryEndpoint = getOtaLastHistoryEndpointForLogs()
          if (
            progress === CodePush.SyncStatus.UP_TO_DATE ||
            progress === CodePush.SyncStatus.SYNC_IN_PROGRESS
          ) {
            return
          }
          console.warn(
            '[OTA] CodePush.sync status:',
            syncStatusLabel(progress),
            `lastHistoryEndpoint=${lastHistoryEndpoint}`
          )
        }
      )
      if (status === CodePush.SyncStatus.UNKNOWN_ERROR) {
        console.warn(
          '[OTA] CodePush.sync finished with UNKNOWN_ERROR',
          `lastHistoryEndpoint=${getOtaLastHistoryEndpointForLogs()}`
        )
      }
      await refresh()
    } catch (e) {
      console.warn(
        '[OTA] CodePush.sync threw',
        e,
        `lastHistoryEndpoint=${getOtaLastHistoryEndpointForLogs()}`
      )
    }
  }, [refresh])

  useEnterForeground(() => {
    dismissedRef.current = false
    refresh().catch(() => {})
    prefetchUpdate().catch(() => {})
    schedulePendingPolls()
  })

  useEffect(() => {
    refresh().catch(() => {})
    prefetchUpdate().catch(() => {})
    schedulePendingPolls()
    return stopPendingPolls
  }, [refresh, prefetchUpdate, schedulePendingPolls, stopPendingPolls])

  const handleDismiss = useCallback(() => {
    dismissedRef.current = true
    setPhase('none')
  }, [])

  const handleRestart = useCallback(() => {
    CodePush.allowRestart()
    CodePush.restartApp(true)
  }, [])

  const showBanner =
    FORCE_OTA_BANNER_PREVIEW || (isOtaEnabled() && phase === 'pending')

  if (!showBanner || isNowPlayingOpen) {
    return null
  }

  const content = (
    <Flex row alignItems='center' gap='s' h={TOAST_HEIGHT} pl='m' pr='xs'>
      <IconArrowRotate size='s' color='active' />
      <Text variant='body' size='s' strength='strong'>
        {messages.pendingBody}
      </Text>
      <Button
        variant='primary'
        size='xs'
        onPress={handleRestart}
        accessibilityLabel={messages.restart}
      >
        {messages.restart}
      </Button>
      <IconButton
        icon={IconClose}
        size='xs'
        color='subdued'
        onPress={handleDismiss}
        accessibilityLabel={messages.dismiss}
      />
    </Flex>
  )

  // Slides rather than fades: the system glass stops rendering under a parent
  // at zero opacity.
  return (
    <View
      pointerEvents='box-none'
      style={[styles.root, { bottom: bottomInset + TOAST_GAP }]}
    >
      <Animated.View
        entering={SlideInDown.springify().damping(18)}
        exiting={SlideOutDown.duration(200)}
        style={styles.shadow}
      >
        {isLiquidGlassAvailable ? (
          <LiquidGlassView
            effect='regular'
            colorScheme={isDarkMode ? 'dark' : 'light'}
            style={styles.capsule}
          >
            {content}
          </LiquidGlassView>
        ) : (
          <GlassSurface showBorder={false} style={styles.capsule}>
            {content}
          </GlassSurface>
        )}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
    elevation: 5
  },
  shadow: {
    borderRadius: TOAST_HEIGHT / 2,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6
  },
  capsule: {
    borderRadius: TOAST_HEIGHT / 2,
    overflow: 'hidden'
  }
})
