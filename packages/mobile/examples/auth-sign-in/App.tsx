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
import { getSDK, config } from './src/sdk'

type Screen = 'home' | 'signed-in'

async function formatApiError(reason: unknown): Promise<string> {
  if (reason != null && typeof reason === 'object' && 'response' in reason) {
    const res = (reason as { response: Response }).response
    if (res != null && typeof res.text === 'function') {
      try {
        const body = await res.text()
        return `API ${res.status}: ${body ?? res.statusText ?? 'Unknown'}`
      } catch {
        return `API ${res.status}`
      }
    }
  }
  return reason instanceof Error ? reason.message : 'Request failed'
}

type Profile = { handle: string; name?: string; userId?: string }

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [feedItems, setFeedItems] = useState<
    Array<{ type: string; title: string; subtitle?: string; trackId?: string }>
  >([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const soundRef = useRef<Audio.Sound | null>(null)

  const audiusSdk = getSDK()

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
            name: user.name,
            userId: String(user.userId ?? '')
          })
          setScreen('signed-in')
        })
        .catch(() => {
          if (!cancelled) setLoading(false)
        })
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
      await audiusSdk.oauth.login({ scope: 'read', display: 'fullScreen' })
      const user = await audiusSdk.oauth.getUser()
      setProfile({
        handle: user.handle ?? 'Unknown',
        name: user.name,
        userId: String(user.userId ?? '')
      })
      setScreen('signed-in')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }, [])

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
    [playingTrackId]
  )

  const handleSignOut = useCallback(async () => {
    await audiusSdk.oauth.logout().catch(() => {})
    setProfile(null)
    setFeedItems([])
    setFeedError(null)
    setScreen('home')
    setError(null)
  }, [])

  useEffect(() => {
    if (screen !== 'signed-in' || !profile?.userId) return
    let cancelled = false
    setFeedLoading(true)
    setFeedError(null)
    audiusSdk.users
      .getUserFeed({ id: profile.userId })
      .then((res) => {
        if (cancelled) return
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
        if (!cancelled) setFeedError(await formatApiError(e))
      })
      .finally(() => {
        if (!cancelled) setFeedLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [screen, profile?.userId])

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
  feedItemSubtitle: { fontSize: 13, color: '#666', marginTop: 2 }
})
