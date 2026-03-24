import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Audio } from 'expo-av'
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
  const [feedItems, setFeedItems] = useState<
    Array<{ type: string; title: string; subtitle?: string; trackId?: string }>
  >([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const soundRef = useRef<Audio.Sound | null>(null)

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
    console.log(`[auth-sign-in] ${line}`)
    setDebugLogs((prev) => [...prev.slice(-79), line])
  }, [])

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false
    })
    return () => {
      soundRef.current?.unloadAsync().catch(() => {})
    }
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
          if (cancelled) return
          logDebug('oauth.getUser succeeded (session restore)', {
            handle: user.handle,
            id: user.id
          })
          setProfile(user)
          setScreen('signed-in')
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
  }, [audiusSdk.oauth, logDebug])

  const handleSignIn = useCallback(async () => {
    opIdRef.current = `signin-${newOperationId()}`
    setError(null)
    setLoading(true)
    try {
      logDebug('Starting oauth.login')
      await audiusSdk.oauth.login({ scope: 'read', display: 'fullScreen' })
      logDebug('oauth.login succeeded')
      const user = await audiusSdk.oauth.getUser()
      logDebug('oauth.getUser succeeded (interactive)', { handle: user.handle, id: user.id })
      setProfile(user)
      setScreen('signed-in')
    } catch (e: unknown) {
      const details = await formatErrorForDebug(e)
      logDebug('Sign-in flow failed', details)
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }, [audiusSdk.oauth, logDebug])

  const handlePlayTrack = useCallback(
    async (trackId: string) => {
      try {
        if (playingTrackId === trackId && soundRef.current) {
          await soundRef.current.stopAsync()
          await soundRef.current.unloadAsync()
          soundRef.current = null
          setPlayingTrackId(null)
          return
        }
        if (soundRef.current) {
          await soundRef.current.unloadAsync()
          soundRef.current = null
        }
        setPlayingTrackId(trackId)
        const streamUrl = await audiusSdk.tracks.getTrackStreamUrl({ trackId })
        const { sound } = await Audio.Sound.createAsync(
          { uri: streamUrl },
          { shouldPlay: true }
        )
        soundRef.current = sound
        await sound.setStatusAsync({ progressUpdateIntervalMillis: 500 })
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinishAndNotReset) {
            setPlayingTrackId(null)
            soundRef.current = null
          }
        })
      } catch {
        setPlayingTrackId(null)
      }
    },
    [playingTrackId, audiusSdk.tracks]
  )

  const handleSignOut = useCallback(async () => {
    logDebug('Starting oauth.logout')
    await audiusSdk.oauth.logout().catch(() => {})
    logDebug('oauth.logout completed')
    setProfile(null)
    setFeedItems([])
    setFeedError(null)
    setScreen('home')
    setError(null)
  }, [audiusSdk.oauth, logDebug])

  useEffect(() => {
    if (screen !== 'signed-in' || !profile?.id) return
    opIdRef.current = `feed-${newOperationId()}`
    let cancelled = false
    setFeedLoading(true)
    setFeedError(null)
    logDebug('Fetching users.getUserFeed', { id: profile.id })
    audiusSdk.users
      .getUserFeed({ id: profile.id })
      .then((res) => {
        if (cancelled) return
        logDebug('users.getUserFeed resolved', { count: res?.data?.length ?? 0 })
        const data = res?.data ?? []
        const items = data.slice(0, 10).map((entry: { type: string; item?: { id?: string; track_id?: string; title?: string; playlistName?: string; user?: { name?: string; handle?: string } } }) => {
          const item = entry.item
          if (entry.type === 'track' && item) {
            const trackId = item.id ?? String((item as { track_id?: string }).track_id ?? '')
            return {
              type: 'track',
              title: item.title ?? 'Track',
              subtitle: item.user?.name ?? item.user?.handle,
              ...(trackId ? { trackId } : {})
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
        const details = await formatErrorForDebug(e)
        logDebug('users.getUserFeed failed', details)
        if (!cancelled) {
          setFeedError(
            typeof details.requestId === 'string'
              ? `${String(details.message)} (requestId: ${details.requestId})`
              : String(details.message)
          )
        }
      })
      .finally(() => {
        if (!cancelled) setFeedLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [screen, profile?.id, audiusSdk.users, logDebug])

  if (!config.isConfigured) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.title}>Audius OAuth</Text>
          <Text style={styles.subtitle}>
            Create a .env with EXPO_PUBLIC_AUDIUS_API_KEY and register redirect
            URI: {config.redirectUri}
          </Text>
          <Text style={styles.code}>Get an API key at audius.co/settings → Developer Apps</Text>
        </View>
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
            <Text style={styles.profileHandle}>@{profile.handle ?? 'user'}</Text>
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
                  <View style={styles.feedItemContent}>
                    <View>
                      <Text style={styles.feedItemType}>{item.type}</Text>
                      <Text style={styles.feedItemTitle}>{item.title}</Text>
                      {item.subtitle ? (
                        <Text style={styles.feedItemSubtitle}>{item.subtitle}</Text>
                      ) : null}
                    </View>
                    {item.type === 'track' && item.trackId ? (
                      <TouchableOpacity
                        style={[styles.feedPlayBtn, playingTrackId === item.trackId && styles.feedPlayBtnActive]}
                        onPress={() => handlePlayTrack(item.trackId!)}
                      >
                        <Text style={styles.feedPlayBtnText}>
                          {playingTrackId === item.trackId ? '⏹' : '▶'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>
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
          Sign in with Audius; the SDK stores tokens and adds auth headers to
          subsequent requests.
        </Text>
        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <TouchableOpacity
            style={styles.signInBtn}
            onPress={handleSignIn}
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
  code: { fontFamily: 'monospace', fontSize: 12, color: '#555', marginTop: 8 },
  signInBtn: {
    backgroundColor: '#CC0FE0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center'
  },
  signInBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
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
  feedSection: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12
  },
  feedTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  feedLoader: { marginVertical: 8 },
  feedError: { fontSize: 13, color: '#d32f2f' },
  feedMuted: { fontSize: 13, color: '#888' },
  feedItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  feedItemContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  feedPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CC0FE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12
  },
  feedPlayBtnActive: { backgroundColor: '#9a0bb3' },
  feedPlayBtnText: { fontSize: 18, color: '#fff' },
  feedItemType: { fontSize: 11, color: '#888', textTransform: 'capitalize', marginBottom: 2 },
  feedItemTitle: { fontSize: 15, fontWeight: '500' },
  feedItemSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  debugTitle: { marginHorizontal: 24, marginTop: 16, fontSize: 13, fontWeight: '600', color: '#333' },
  debugSession: {
    marginHorizontal: 24,
    fontSize: 11,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 6
  },
  debugBox: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#111',
    maxHeight: 180
  },
  debugLine: { fontSize: 11, color: '#ddd', marginBottom: 4 }
})
