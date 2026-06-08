import { useEffect, useState } from 'react'

import { Platform, StyleSheet, View } from 'react-native'

import { Flex, Paper } from '@audius/harmony-native'
import {
  getOtaBuildConfigForDiagnostics,
  getOtaHistoryFetchDiagnostics
} from 'app/app/ota-updates'
import { Text } from 'app/components/core'

const messages = {
  title: 'OTA',
  hint: 'Tap version line 7× to hide.',
  none: '—'
}

export const OtaAboutDiagnostics = () => {
  const [build] = useState(() => getOtaBuildConfigForDiagnostics())
  const [d, setD] = useState(getOtaHistoryFetchDiagnostics)

  useEffect(() => {
    const id = setInterval(() => {
      setD(getOtaHistoryFetchDiagnostics())
    }, 2000)
    return () => clearInterval(id)
  }, [])

  const mono = Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace'
  })

  const line = (label: string, value: string) => (
    <Text variant='body2' color='neutralLight4' style={{ fontFamily: mono }}>
      {`${label}: ${value}`}
    </Text>
  )

  return (
    <View style={styles.wrap}>
      <Paper
        borderRadius='m'
        shadow='flat'
        backgroundColor='surface2'
        style={styles.card}
      >
        <Flex column gap='xs'>
          <Text variant='body' weight='bold' color='neutralLight3'>
            {messages.title}
          </Text>
          <Text variant='body2' color='neutralLight4'>
            {messages.hint}
          </Text>
          {line('package.json', build.packageJsonAppVersion)}
          {line('native (last)', d.nativeAppVersionLast ?? messages.none)}
          {line('channel', build.channel)}
          {line('baseUrl', build.baseUrl)}
          {line('lastEndpoint', d.lastUrl ?? messages.none)}
          {line('outcome', d.lastOutcome)}
          {line(
            'error',
            d.lastError != null && d.lastError.length > 0
              ? d.lastError
              : messages.none
          )}
        </Flex>
      </Paper>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12, paddingHorizontal: 16 },
  card: { padding: 12 }
})
