import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import { type User } from '@audius/sdk'

import {
  createSessionId,
  formatErrorForDebug,
  newOperationId
} from '../shared/exampleDebug'
import { getSDK, config } from './src/sdk'

type Screen = 'home' | 'signed-in'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [description, setDescription] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [debugLogs, setDebugLogs] = useState<string[]>([])

  const sessionIdRef = useRef(createSessionId())
  const opIdRef = useRef(`boot-${newOperationId()}`)

  const audiusSdk = getSDK()

  const logDebug = useCallback((message: string, payload?: unknown) => {
    const timestamp = new Date().toISOString().slice(11, 19)
    const details =
      payload === undefined
        ? ''
        : ` ${JSON.stringify(
            payload,
            (_, value) => (value instanceof Error ? value.message : value),
            2
          )}`
    const line = `[sess:${sessionIdRef.current}][op:${opIdRef.current}] [${timestamp}] ${message}${details}`
    console.log(`[update-profile] ${line}`)
    setDebugLogs((prev) => [...prev.slice(-79), line])
  }, [])

  useEffect(() => {
    let cancelled = false
    opIdRef.current = `restore-${newOperationId()}`
    logDebug('Checking existing OAuth session')
    audiusSdk.oauth.isAuthenticated().then((authenticated) => {
      logDebug('oauth.isAuthenticated resolved', { authenticated })
      if (cancelled) return
      if (!authenticated) {
        setLoading(false)
        return
      }
      audiusSdk.oauth
        .getUser()
        .then((user) => {
          logDebug('oauth.getUser succeeded (session restore)', {
            handle: user.handle,
            id: user.id
          })
          if (cancelled) return
          setProfile(user)
          setScreen('signed-in')
          logDebug('Fetching profile via users.getUser (session restore)', {
            id: user.id
          })
          return audiusSdk.users.getUser({ id: user.id })
        })
        .then((userRes) => {
          logDebug('users.getUser resolved (session restore)', {
            hasData: Boolean(userRes?.data),
            bioLength: userRes?.data?.bio?.length ?? 0
          })
          if (userRes?.data?.bio != null) setDescription(userRes.data.bio)
        })
        .catch(async (e) => {
          console.error('Failed to get user', e)
          const details = await formatErrorForDebug(e)
          logDebug('Session restore failed', details)
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    })
    return () => {
      cancelled = true
    }
  }, [audiusSdk.oauth, audiusSdk.users, logDebug])

  const handleSignIn = useCallback(async () => {
    opIdRef.current = `signin-${newOperationId()}`
    setError(null)
    setLoading(true)
    try {
      logDebug('Starting oauth.login')
      await audiusSdk.oauth.login({ scope: 'write', display: 'fullScreen' })
      logDebug('oauth.login succeeded')
      logDebug('Token state after login', {
        isAuthenticated: await audiusSdk.oauth.isAuthenticated(),
        hasRefreshToken: await audiusSdk.oauth.hasRefreshToken()
      })
      const user = await audiusSdk.oauth.getUser()
      logDebug('oauth.getUser succeeded (interactive sign-in)', {
        handle: user.handle,
        id: user.id
      })
      setProfile(user)
      setScreen('signed-in')
      try {
        logDebug('Fetching profile via users.getUser (interactive sign-in)', {
          id: user.id
        })
        const userRes = await audiusSdk.users.getUser({ id: user.id })
        logDebug('users.getUser resolved (interactive sign-in)', {
          hasData: Boolean(userRes?.data),
          bioLength: userRes?.data?.bio?.length ?? 0
        })
        setDescription(userRes?.data?.bio ?? '')
      } catch (e) {
        const details = await formatErrorForDebug(e)
        logDebug('users.getUser failed after sign-in', details)
        setDescription('')
      }
    } catch (e: unknown) {
      const details = await formatErrorForDebug(e)
      logDebug('Sign-in flow failed', details)
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }, [audiusSdk.oauth, audiusSdk.users, logDebug])

  const handleSignOut = useCallback(async () => {
    logDebug('Starting oauth.logout')
    await audiusSdk.oauth.logout().catch(() => {})
    logDebug('oauth.logout completed')
    setProfile(null)
    setDescription('')
    setResult(null)
    setTxHash(null)
    setScreen('home')
    setError(null)
  }, [audiusSdk.oauth, logDebug])

  const handleUpdate = useCallback(async () => {
    if (!profile) return
    opIdRef.current = `update-${newOperationId()}`
    setUpdateLoading(true)
    setResult(null)
    setTxHash(null)
    try {
      logDebug('Calling users.updateUser', {
        id: profile.id,
        bioLength: description.trim().length
      })
      const res = await audiusSdk.users.updateUser({
        id: profile.id,
        userId: profile.id,
        metadata: { bio: description.trim() }
      })
      const hash = res?.transactionHash ?? (res as { transaction_hash?: string })?.transaction_hash ?? null
      logDebug('users.updateUser succeeded', { transactionHash: hash })
      setTxHash(hash ?? null)
      setResult('Description updated.')
    } catch (e: unknown) {
      const details = await formatErrorForDebug(e)
      logDebug('users.updateUser failed', details)
      setResult(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setUpdateLoading(false)
    }
  }, [audiusSdk.users, description, logDebug, profile])

  if (!config.isConfigured) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Update profile</Text>
          <Text style={styles.required}>
            Create a .env with EXPO_PUBLIC_AUDIUS_API_KEY and register redirect
            URI: updateprofile://oauth/callback
          </Text>
          <Text style={styles.code}>
            Get an API key at audius.co/settings → Developer Apps. No server needed — updates use OAuth from the app.
          </Text>
        </View>
        <StatusBar style="auto" />
      </View>
    )
  }

  if (screen === 'signed-in' && profile) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <Text style={styles.handle}>@{profile.handle ?? 'user'}</Text>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Text style={styles.signOutBtnText}>Sign out</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Update description</Text>
          <Text style={styles.subtitle}>
            Your bio is updated via the OAuth access token — no backend required.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="New description"
            placeholderTextColor="#888"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[styles.button, updateLoading && styles.buttonDisabled]}
            onPress={handleUpdate}
            disabled={updateLoading}
          >
            {updateLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Update description</Text>
            )}
          </TouchableOpacity>
          {result ? <Text style={styles.result}>{result}</Text> : null}
          {txHash ? (
            <TouchableOpacity
              style={styles.txLink}
              onPress={() =>
                Linking.openURL(
                  `https://explorer.audius.engineering/transaction/${txHash}`
                )
              }
            >
              <Text style={styles.txLinkText}>View transaction</Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.debugTitle}>Debug Log</Text>
          <Text style={styles.debugSession} selectable>
            Session: {sessionIdRef.current} (share with support)
          </Text>
          <View style={styles.debugBox}>
            {debugLogs.length === 0 ? (
              <Text style={styles.debugLine}>No log entries yet</Text>
            ) : (
              debugLogs.slice(-10).map((line, index) => (
                <Text key={`${line}-${index}`} style={styles.debugLine}>
                  {line}
                </Text>
              ))
            )}
          </View>
        </View>
        <StatusBar style="auto" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Update profile</Text>
        <Text style={styles.subtitle}>
          Sign in with Audius (write scope) to update your description directly from the app.
        </Text>
        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Sign in with Audius (write)</Text>
          </TouchableOpacity>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  center: { flex: 1, padding: 24, justifyContent: 'center' },
  card: { margin: 24, padding: 24, backgroundColor: '#f5f5f5', borderRadius: 12 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  required: { fontSize: 13, color: '#333', marginTop: 12 },
  code: { fontFamily: 'monospace', fontSize: 12, color: '#555', marginTop: 6 },
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  handle: { fontSize: 16, color: '#333' },
  signOutBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  signOutBtnText: { color: '#0066cc', fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top'
  },
  button: {
    backgroundColor: '#CC0FE0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  result: { fontSize: 13, color: '#333', marginTop: 12 },
  txLink: { marginTop: 8 },
  txLinkText: { fontSize: 14, color: '#0066cc', textDecorationLine: 'underline' },
  debugTitle: { marginTop: 16, fontSize: 13, fontWeight: '600', color: '#333' },
  debugSession: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 6
  },
  debugBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#111',
    maxHeight: 180
  },
  debugLine: { fontSize: 11, color: '#ddd', marginBottom: 4 },
  loader: { marginVertical: 16 },
  error: { color: '#d32f2f', marginTop: 12, fontSize: 13 }
})
