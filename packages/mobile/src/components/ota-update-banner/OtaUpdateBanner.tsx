import { useCallback, useEffect, useRef, useState } from 'react'

import CodePush from '@bravemobile/react-native-code-push'
import { StyleSheet, View } from 'react-native'

import {
  Flex,
  IconButton,
  IconClose,
  Paper,
  PlainButton,
  Text,
  useTheme
} from '@audius/harmony-native'
import {
  getOtaLastHistoryEndpointForLogs,
  isOtaEnabled
} from 'app/app/ota-updates'
import { useEnterForeground } from 'app/hooks/useAppState'

/** Set to `true` to always show the banner for layout preview; use `false` in production. */
const FORCE_OTA_BANNER_PREVIEW = false

const messages = {
  pendingBody: 'The latest version is ready. Restart to finish updating.',
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
 * CodePush is configured in ota-root (ON_APP_RESUME) to fetch updates with
 * ON_NEXT_RESTART. We only surface UI when an update is already downloaded
 * and installed as pending — then the user restarts when they want.
 */
export const OtaUpdateBanner = () => {
  const { color, spacing } = useTheme()
  const [phase, setPhase] = useState<BannerPhase>('none')
  const dismissedRef = useRef(false)
  const pendingLoggedRef = useRef(false)
  const pollTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const refresh = useCallback(async () => {
    if (!isOtaEnabled()) {
      if (!FORCE_OTA_BANNER_PREVIEW) {
        setPhase('none')
      } else {
        setPhase('pending')
      }
      return
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
        return
      }
      pendingLoggedRef.current = false
      setPhase('none')
    } catch (e) {
      console.warn(
        '[OTA] getUpdateMetadata(PENDING) failed',
        e,
        `lastHistoryEndpoint=${getOtaLastHistoryEndpointForLogs()}`
      )
      setPhase('none')
    }
  }, [])

  const schedulePendingPolls = useCallback(() => {
    pollTimeoutsRef.current.forEach(clearTimeout)
    pollTimeoutsRef.current = []
    if (!isOtaEnabled()) {
      return
    }
    const delaysMs = [0, 800, 2000, 4000]
    delaysMs.forEach((ms) => {
      const id = setTimeout(() => {
        refresh().catch(() => {})
      }, ms)
      pollTimeoutsRef.current.push(id)
    })
  }, [refresh])

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
    return () => {
      pollTimeoutsRef.current.forEach(clearTimeout)
      pollTimeoutsRef.current = []
    }
  }, [refresh, prefetchUpdate, schedulePendingPolls])

  const handleDismiss = useCallback(() => {
    dismissedRef.current = true
    setPhase('none')
  }, [])

  const handleRestart = useCallback(() => {
    CodePush.allowRestart()
    CodePush.restartApp(true)
  }, [])

  const uiPhase: BannerPhase = FORCE_OTA_BANNER_PREVIEW ? 'pending' : phase

  const showBanner =
    FORCE_OTA_BANNER_PREVIEW || (isOtaEnabled() && phase === 'pending')

  if (!showBanner) {
    return null
  }

  return (
    <View
      style={[
        styles.inline,
        {
          paddingHorizontal: spacing.m,
          paddingTop: spacing.xs,
          paddingBottom: spacing.s
        }
      ]}
    >
      <Paper
        borderRadius='l'
        shadow='mid'
        backgroundColor='surface1'
        style={[
          styles.card,
          {
            paddingVertical: spacing.m,
            paddingHorizontal: spacing.m,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: color.border.default
          }
        ]}
      >
        <Flex row alignItems='center' justifyContent='space-between' gap='m'>
          <Flex row alignItems='center' gap='s' style={styles.body}>
            <Text color='subdued' variant='body' size='s' flexShrink={1}>
              {messages.pendingBody}
            </Text>
          </Flex>
          <Flex row alignItems='center' gap='s'>
            {uiPhase === 'pending' ? (
              <>
                <PlainButton
                  variant='default'
                  onPress={handleRestart}
                  accessibilityLabel={messages.restart}
                >
                  {messages.restart}
                </PlainButton>
                <IconButton
                  icon={IconClose}
                  size='s'
                  color='subdued'
                  onPress={handleDismiss}
                  accessibilityLabel={messages.dismiss}
                />
              </>
            ) : null}
          </Flex>
        </Flex>
      </Paper>
    </View>
  )
}

const styles = StyleSheet.create({
  inline: {
    width: '100%'
  },
  card: {
    overflow: 'visible'
  },
  body: {
    flex: 1,
    minWidth: 0
  }
})
