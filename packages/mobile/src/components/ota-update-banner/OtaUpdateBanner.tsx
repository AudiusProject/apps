import { useCallback, useEffect, useRef, useState } from 'react'

import CodePush from '@bravemobile/react-native-code-push'
import {
  Flex,
  IconButton,
  IconClose,
  Paper,
  PlainButton,
  Text,
  useTheme
} from '@audius/harmony-native'
import { StyleSheet, View } from 'react-native'

import { isOtaEnabled } from 'app/app/ota-updates'
import { useEnterForeground } from 'app/hooks/useAppState'

/** Set to `true` to always show the banner for layout preview; use `false` in production. */
const FORCE_OTA_BANNER_PREVIEW = false

const messages = {
  pendingBody: 'The latest version is ready. Restart to finish updating.',
  restart: 'Restart',
  dismiss: 'Dismiss'
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
        setPhase(dismissedRef.current ? 'none' : 'pending')
        return
      }
      setPhase('none')
    } catch {
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
        void refresh()
      }, ms)
      pollTimeoutsRef.current.push(id)
    })
  }, [refresh])

  const prefetchUpdate = useCallback(async () => {
    if (!isOtaEnabled()) {
      return
    }
    try {
      await CodePush.sync({
        installMode: CodePush.InstallMode.ON_NEXT_RESTART,
        mandatoryInstallMode: CodePush.InstallMode.IMMEDIATE
      })
      await refresh()
    } catch {
      /* sync may fail or return SYNC_IN_PROGRESS; polling still runs */
    }
  }, [refresh])

  useEnterForeground(() => {
    dismissedRef.current = false
    void refresh()
    void prefetchUpdate()
    schedulePendingPolls()
  })

  useEffect(() => {
    void refresh()
    void prefetchUpdate()
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
