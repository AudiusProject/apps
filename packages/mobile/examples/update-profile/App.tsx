import { useCallback, useEffect, useState } from 'react'
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
import { getSDK, config } from './src/sdk'

type Screen = 'home' | 'signed-in'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ handle: string; userId: string } | null>(null)
  const [description, setDescription] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const audiusSdk = getSDK()

  useEffect(() => {
    let cancelled = false
    audiusSdk.oauth.isAuthenticated().then((authenticated) => {
      if (cancelled) return
      if (!authenticated) {
        setLoading(false)
        return
      }
      audiusSdk.oauth
        .getUser()
        .then((user) => {
          if (cancelled) return
          setProfile({
            handle: user.handle ?? 'Unknown',
            userId: String(user.userId ?? '')
          })
          setScreen('signed-in')
          return audiusSdk.users.getUser({ id: String(user.userId ?? '') })
        })
        .then((userRes) => {
          if (userRes?.data?.bio != null) setDescription(userRes.data.bio)
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSignIn = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      await audiusSdk.oauth.login({ scope: 'write', display: 'fullScreen' })
      const user = await audiusSdk.oauth.getUser()
      setProfile({
        handle: user.handle ?? 'Unknown',
        userId: String(user.userId ?? '')
      })
      setScreen('signed-in')
      try {
        const userRes = await audiusSdk.users.getUser({ id: String(user.userId ?? '') })
        setDescription(userRes?.data?.bio ?? '')
      } catch {
        setDescription('')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    await audiusSdk.oauth.logout().catch(() => {})
    setProfile(null)
    setDescription('')
    setResult(null)
    setTxHash(null)
    setScreen('home')
    setError(null)
  }, [])

  const handleUpdate = useCallback(async () => {
    if (!profile) return
    setUpdateLoading(true)
    setResult(null)
    setTxHash(null)
    try {
      const res = await audiusSdk.users.updateUser({
        id: profile.userId,
        userId: profile.userId,
        metadata: { bio: description.trim() }
      })
      const hash = res?.transactionHash ?? (res as { transaction_hash?: string })?.transaction_hash ?? null
      setTxHash(hash ?? null)
      setResult('Description updated.')
    } catch (e: unknown) {
      setResult(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setUpdateLoading(false)
    }
  }, [profile, description])

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
            <Text style={styles.handle}>@{profile.handle}</Text>
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
  loader: { marginVertical: 16 },
  error: { color: '#d32f2f', marginTop: 12, fontSize: 13 }
})
