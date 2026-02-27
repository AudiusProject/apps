import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { WebView } from 'react-native-webview'
import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import { buildOAuthUrl, randomState } from './src/oauth/buildOAuthUrl'
import { getAuthenticatedSDK, getSDK, clearAuthenticatedSDK } from './src/sdk'

// Audius OAuth only allows http/https redirect URIs (not custom schemes).
// Using localhost so the WebView can intercept the redirect without a real server.
const REDIRECT_URI = 'http://localhost/oauth/callback'
const REDIRECT_URI_OR_SCHEME = REDIRECT_URI

async function formatApiError(reason: unknown): Promise<string> {
  if (reason != null && typeof reason === 'object' && 'response' in reason) {
    const res = (reason as { response: Response }).response
    if (res != null && typeof res.text === 'function') {
      try {
        const body = await res.text()
        return `API ${res.status}: ${body || res.statusText || 'Unknown'}`
      } catch {
        return `API ${res.status}`
      }
    }
  }
  return reason instanceof Error ? reason.message : 'Request failed'
}

type Screen = 'home' | 'webview' | 'signed-in'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ handle: string; name?: string; userId?: string } | null>(null)
  const [feedItems, setFeedItems] = useState<Array<{ type: string; title: string; subtitle?: string }>>([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)
  const oauthStateRef = useRef<string | null>(null)

  const handleOpenAuth = useCallback(() => {
    setError(null)
    const state = randomState()
    oauthStateRef.current = state
    setScreen('webview')
  }, [])

  const handleRedirect = useCallback(
    async (url: string) => {
      const isRedirect =
        url.startsWith(REDIRECT_URI_OR_SCHEME) ||
        url.startsWith('audiusauth://oauth/callback')
      if (!isRedirect) return
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
        const audiusSdk = getAuthenticatedSDK(token)
        // Verify token with unauthenticated SDK (verify_token expects only query param, not Bearer).
        const verifyRes = await getSDK().users.verifyIDToken({ token })
        const data = verifyRes.data
        if (data) {
          setProfile({
            handle: data.handle ?? data.sub ?? 'Unknown',
            name: data.name,
            userId: data.userId ?? data.sub
          })
          setScreen('signed-in')
        } else {
          setError('Invalid token')
        }
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
    const sub = Linking.addEventListener('url', (event) => {
      handleRedirect(event.url)
    })
    Linking.getInitialURL().then((url) => {
      if (url) handleRedirect(url)
    })
    return () => sub.remove()
  }, [handleRedirect])

  const handleSignOut = useCallback(() => {
    clearAuthenticatedSDK()
    setProfile(null)
    setFeedItems([])
    setFeedError(null)
    setScreen('home')
    setError(null)
  }, [])

  // Fetch my feed when signed in. Use unauthenticated SDK — user feed is public.
  useEffect(() => {
    if (screen !== 'signed-in' || !profile?.userId) return
    const sdk = getSDK()
    let cancelled = false
    setFeedLoading(true)
    setFeedError(null)
    sdk.users
      .getUserFeed({ id: profile.userId })
      .then((res) => {
        if (cancelled) return
        const data = res?.data ?? []
        const items = data.slice(0, 10).map((entry: { type: string; item?: { title?: string; playlistName?: string; user?: { name?: string; handle?: string } } }) => {
          const item = entry.item
          if (entry.type === 'track' && item) {
            return {
              type: 'track',
              title: item.title ?? 'Track',
              subtitle: item.user?.name ?? item.user?.handle
            }
          }
          if (entry.type === 'playlist' && item) {
            return {
              type: 'playlist',
              title: (item as { playlistName?: string }).playlistName ?? 'Playlist',
              subtitle: (item as { user?: { name?: string; handle?: string } }).user?.name ?? (item as { user?: { handle?: string } }).user?.handle
            }
          }
          return { type: entry.type, title: 'Item', subtitle: undefined }
        })
        setFeedItems(items)
      })
      .catch(async (e) => {
        if (!cancelled) {
          const msg = await formatApiError(e)
          if (!cancelled) setFeedError(msg)
        }
      })
      .finally(() => {
        if (!cancelled) setFeedLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [screen, profile?.userId])

  if (screen === 'webview') {
    const state = oauthStateRef.current ?? randomState()
    oauthStateRef.current = state
    const oauthUrl = buildOAuthUrl({
      scope: 'read',
      redirectUri: REDIRECT_URI,
      state,
      responseMode: 'query',
      display: 'fullScreen',
      appName: 'AudiusAuthExample'
    })
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setScreen('home')}
        >
          <Text style={styles.backBtnText}>← Cancel</Text>
        </TouchableOpacity>
        <WebView
          source={{ uri: oauthUrl }}
          style={styles.webview}
          onShouldStartLoadWithRequest={(req) => {
            const isRedirect =
              req.url.startsWith(REDIRECT_URI_OR_SCHEME) ||
              req.url.startsWith('audiusauth://oauth/callback')
            if (isRedirect) {
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

  if (screen === 'signed-in' && profile) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.profileCard}>
            <Text style={styles.profileTitle}>Signed in</Text>
            <Text style={styles.profileHandle}>@{profile.handle}</Text>
            {profile.name ? (
              <Text style={styles.profileName}>{profile.name}</Text>
            ) : null}
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Text style={styles.signOutBtnText}>Sign out</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.feedSection}>
            <Text style={styles.feedTitle}>Your feed</Text>
            {feedLoading ? (
              <ActivityIndicator size="small" style={styles.feedLoader} />
            ) : feedError ? (
              <Text style={styles.feedError}>{feedError}</Text>
            ) : feedItems.length === 0 ? (
              <Text style={styles.feedMuted}>No feed items yet</Text>
            ) : (
              feedItems.map((item, i) => (
                <View key={i} style={styles.feedItem}>
                  <Text style={styles.feedItemType}>{item.type}</Text>
                  <Text style={styles.feedItemTitle}>{item.title}</Text>
                  {item.subtitle ? (
                    <Text style={styles.feedItemSubtitle}>{item.subtitle}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>
        <StatusBar style="auto" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Audius OAuth</Text>
        <Text style={styles.subtitle}>
          Sign in with Audius (OAuth), then use authenticated API calls in your code.
        </Text>
        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={handleOpenAuth}
            disabled={loading}
          >
            <Text style={styles.signInBtnText}>Sign in with Audius</Text>
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
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  signInBtn: {
    backgroundColor: '#CC0FE0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center'
  },
  signInBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backBtn: { padding: 16 },
  backBtnText: { color: '#0066cc', fontSize: 16 },
  webview: { flex: 1 },
  loader: { marginVertical: 16 },
  error: { color: '#d32f2f', marginTop: 12 },
  profileCard: {
    margin: 24,
    padding: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 12
  },
  profileTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  profileHandle: { fontSize: 18, color: '#333', marginBottom: 4 },
  profileName: { fontSize: 14, color: '#666', marginBottom: 16 },
  signOutBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16
  },
  signOutBtnText: { color: '#0066cc', fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  feedSection: { marginHorizontal: 24, marginTop: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 12 },
  feedTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  feedLoader: { marginVertical: 8 },
  feedError: { fontSize: 13, color: '#d32f2f' },
  feedMuted: { fontSize: 13, color: '#888' },
  feedItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  feedItemType: { fontSize: 11, color: '#888', textTransform: 'capitalize', marginBottom: 2 },
  feedItemTitle: { fontSize: 15, fontWeight: '500' },
  feedItemSubtitle: { fontSize: 13, color: '#666', marginTop: 2 }
})
