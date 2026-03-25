import { useEffect, useState } from 'react'

import CodePush from '@bravemobile/react-native-code-push'
import { Platform, StyleSheet, View } from 'react-native'

import { Flex, Paper } from '@audius/harmony-native'
import {
  getOtaBuildConfigForDiagnostics,
  getOtaHistoryFetchDiagnostics
} from 'app/app/ota-updates'
import { Text } from 'app/components/core'

const messages = {
  title: 'OTA (diagnostics)',
  toggleHint: 'Tap the version line 7× quickly to hide.',
  enabled: 'Enabled',
  baseUrl: 'Base URL',
  channel: 'Channel',
  lastUrl: 'Last history URL',
  outcome: 'Last outcome',
  http: 'HTTP',
  entries: 'Entries',
  error: 'Error',
  updated: 'Updated',
  running: 'RUNNING',
  pending: 'PENDING',
  label: 'label',
  hash: 'hash',
  none: '—'
}

const truncate = (value: string | undefined, max = 14): string => {
  if (value == null || value.length === 0) {
    return messages.none
  }
  return value.length <= max ? value : `${value.slice(0, max)}…`
}

const formatTime = (ms: number): string =>
  ms <= 0 ? messages.none : new Date(ms).toISOString()

type PackageMeta = {
  label?: string
  packageHash?: string
} | null

export const OtaAboutDiagnostics = () => {
  const [build] = useState(() => getOtaBuildConfigForDiagnostics())
  const [historyDiag, setHistoryDiag] = useState(getOtaHistoryFetchDiagnostics)
  const [runningMeta, setRunningMeta] = useState<PackageMeta>(null)
  const [pendingMeta, setPendingMeta] = useState<PackageMeta>(null)

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      setHistoryDiag(getOtaHistoryFetchDiagnostics())
      try {
        const [running, pending] = await Promise.all([
          CodePush.getUpdateMetadata(CodePush.UpdateState.RUNNING),
          CodePush.getUpdateMetadata(CodePush.UpdateState.PENDING)
        ])
        if (!cancelled) {
          setRunningMeta(running)
          setPendingMeta(pending)
        }
      } catch {
        if (!cancelled) {
          setRunningMeta(null)
          setPendingMeta(null)
        }
      }
    }
    tick().catch(() => {})
    const id = setInterval(() => {
      tick().catch(() => {})
    }, 1500)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const mono = Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace'
  })

  const row = (k: string, v: string) => (
    <Text variant='body2' color='neutralLight4' style={{ fontFamily: mono }}>
      {`${k}: ${v}`}
    </Text>
  )

  return (
    <View style={styles.wrap} accessibilityLabel={messages.title}>
      <Paper
        borderRadius='m'
        shadow='flat'
        backgroundColor='surface2'
        style={styles.cardOuter}
      >
        <Flex column gap='xs'>
          <Text variant='body' weight='bold' color='neutralLight3'>
            {messages.title}
          </Text>
          <Text variant='body2' color='neutralLight4'>
            {messages.toggleHint}
          </Text>
          {row(messages.enabled, String(build.enabled))}
          {row(messages.baseUrl, build.baseUrl)}
          {row(messages.channel, build.channel)}
          {row(messages.lastUrl, historyDiag.lastUrl ?? messages.none)}
          {row(messages.outcome, historyDiag.lastOutcome)}
          {row(
            messages.http,
            historyDiag.lastHttpStatus != null
              ? String(historyDiag.lastHttpStatus)
              : messages.none
          )}
          {row(
            messages.entries,
            historyDiag.lastEntryCount != null
              ? String(historyDiag.lastEntryCount)
              : messages.none
          )}
          {row(messages.error, historyDiag.lastError ?? messages.none)}
          {row(messages.updated, formatTime(historyDiag.updatedAtMs))}
          {row(
            `${messages.running} ${messages.label}`,
            runningMeta?.label ?? messages.none
          )}
          {row(
            `${messages.running} ${messages.hash}`,
            truncate(runningMeta?.packageHash)
          )}
          {row(
            `${messages.pending} ${messages.label}`,
            pendingMeta?.label ?? messages.none
          )}
          {row(
            `${messages.pending} ${messages.hash}`,
            truncate(pendingMeta?.packageHash)
          )}
        </Flex>
      </Paper>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
    paddingHorizontal: 16
  },
  cardOuter: {
    padding: 12
  }
})
