import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { WebView } from 'react-native-webview'
import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import { buildOAuthUrl, randomState } from './src/oauth/buildOAuthUrl'
import { getSDK } from './src/sdk'
import { config } from './src/config'

const REDIRECT_URI = 'http://localhost/oauth/callback'

type Screen = 'home' | 'webview' | 'signed-in'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ handle: string } | null>(null)
  const [description, setDescription] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const oauthStateRef = useRef<string | null>(null)

  const handleOpenAuth = useCallback(() => {
    setError(null)
    const state = randomState()
    oauthStateRef.current = state
    setScreen('webview')
  }, [])

  const handleRedirect = useCallback(
    async (url: string) => {
      if (!url.startsWith(REDIRECT_URI) && !url.startsWith('audiuswrites://oauth/callback')) return
      setScreen('home')
      setLoading(true)
      setError(null)
      try {
        const parsed = Linking.parse(url)
        const query = (parsed.queryParams ?? {}) as Record<string, string>
        const token = query.token ?? query.access_token ?? (parsed.fragment ?? '').split('token=')[1]?.split('&')[0]
        const state = query.state
        if (!token) {
          setError('No token in redirect')
          return
        }
        if (state !== oauthStateRef.current) {
          setError('State mismatch')
          return
        }
        const verifyRes = await getSDK().users.verifyIDToken({ token })
        const data = verifyRes.data
        if (!data) {
          setError('Invalid token')
          return
        }
        const uid = data.userId ?? data.sub
        setProfile({ handle: data.handle ?? data.sub ?? 'Unknown' })
        setUserId(uid)
        setScreen('signed-in')
      } catch (e: unknown) {
        if (e && typeof e === 'object' && 'response' in e && e.response && typeof (e.response as Response).text === 'function') {
          const res = e.response as Response
          try {
            const body = await res.text()
            setError(`API error ${res.status}: ${body || res.statusText || 'Unknown'}`)
          } catch {
            setError(`API error ${res.status}`)
          }
        } else {
          setError(e instanceof Error ? e.message : 'Sign-in failed')
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    const sub = Linking.addEventListener('url', (event) => handleRedirect(event.url))
    Linking.getInitialURL().then((url) => { if (url) handleRedirect(url) })
    return () => sub.remove()
  }, [handleRedirect])

  const handleSignOut = useCallback(() => {
    setUserId(null)
    setProfile(null)
    setDescription('')
    setResult(null)
    setScreen('home')
    setError(null)
  }, [])

  const handleUpdate = useCallback(async () => {
    if (!config.writeServerUrl || !userId) return
    setUpdateLoading(true)
    setResult(null)
    try {
      const res = await fetch(`${config.writeServerUrl}/update-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, description: description.trim() })
      })
      const data = await res.json().catch(() => ({}))
      const bodyStr = JSON.stringify(data, null, 2)
      console.log('[update-description] response body', bodyStr)
      if (res.ok) {
        const txHash = data?.transaction_hash ?? data?.transactionHash
        setResult(txHash ? `Description updated. Tx: ${txHash}` : 'Description updated.')
      } else {
        setResult(data?.error ?? `Error ${res.status}`)
      }
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setUpdateLoading(false)
    }
  }, [userId, description])

  if (screen === 'webview') {
    const state = oauthStateRef.current ?? randomState()
    oauthStateRef.current = state
    const oauthUrl = buildOAuthUrl({
      scope: 'write',
      redirectUri: REDIRECT_URI,
      state,
      responseMode: 'query',
      display: 'fullScreen',
      ...(config.apiKey ? { apiKey: config.apiKey } : { appName: 'AudiusWritesExample' })
    })
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('home')}>
          <Text style={styles.backBtnText}>← Cancel</Text>
        </TouchableOpacity>
        <WebView
          source={{ uri: oauthUrl }}
          style={styles.webview}
          onShouldStartLoadWithRequest={(req) => {
            if (req.url.startsWith(REDIRECT_URI) || req.url.startsWith('audiuswrites://oauth/callback')) {
              handleRedirect(req.url)
              return false
            }
            return true
          }}
        />
        <StatusBar style="auto" />
      </View>
    )
  }

  if (screen === 'signed-in' && userId && profile) {
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
            Server uses your stored bearer to update your bio.
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
        </View>
        <StatusBar style="auto" />
      </View>
    )
  }

  if (!config.isConfigured) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Authenticated writes</Text>
          <Text style={styles.required}>
            Requires your server. Create a .env with:
          </Text>
          <Text style={styles.code}>EXPO_PUBLIC_AUDIUS_API_KEY=your_api_key</Text>
          <Text style={styles.code}>EXPO_PUBLIC_WRITE_SERVER_URL=http://localhost:3001</Text>
          <Text style={styles.required}>
            Run the server with AUDIUS_API_KEY. See README.
          </Text>
        </View>
        <StatusBar style="auto" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Authenticated writes</Text>
        <Text style={styles.subtitle}>
          Sign in with Audius (write scope) to authorize the app, then update your description.
        </Text>
        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleOpenAuth} disabled={loading}>
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
  loader: { marginVertical: 16 },
  error: { color: '#d32f2f', marginTop: 12, fontSize: 13 },
  backBtn: { padding: 16 },
  backBtnText: { color: '#0066cc', fontSize: 16 },
  webview: { flex: 1 }
})
