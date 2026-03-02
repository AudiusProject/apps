import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { WebView } from 'react-native-webview'
import { StatusBar } from 'expo-status-bar'
import { Audio } from 'expo-av'
import * as Linking from 'expo-linking'
import { buildOAuthUrl, randomState } from './src/oauth/buildOAuthUrl'
import { getSDK } from './src/sdk'
import { config } from './src/config'

const REDIRECT_URI = 'http://localhost/oauth/callback'

type Screen = 'home' | 'webview' | 'signed-in'

type Track = {
  id: string
  title?: string
  user?: { name?: string; handle?: string }
  playCount?: number
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ handle: string } | null>(null)
  const [track, setTrack] = useState<Track | null>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [repostLoading, setRepostLoading] = useState(false)
  const [liked, setLiked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const oauthStateRef = useRef<string | null>(null)
  const soundRef = useRef<Audio.Sound | null>(null)

  const handleOpenAuth = useCallback(() => {
    setError(null)
    const state = randomState()
    oauthStateRef.current = state
    setScreen('webview')
  }, [])

  const handleRedirect = useCallback(
    async (url: string) => {
      if (!url.startsWith(REDIRECT_URI) && !url.startsWith('likerepost://oauth/callback')) return
      setScreen('home')
      setLoading(true)
      setError(null)
      try {
        const parsed = Linking.parse(url)
        const query = (parsed.queryParams ?? {}) as Record<string, string>
        const token =
          query.token ??
          query.access_token ??
          (parsed.fragment ?? '').split('token=')[1]?.split('&')[0]
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
        const uid = String(data.userId ?? data.sub ?? '')
        setProfile({ handle: data.handle ?? data.sub ?? 'Unknown' })
        setUserId(uid)
        setScreen('signed-in')
        setTrack(null)
        setResult(null)
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
    const sub = Linking.addEventListener('url', (event) => handleRedirect(event.url))
    Linking.getInitialURL().then((url) => {
      if (url) handleRedirect(url)
    })
    return () => sub.remove()
  }, [handleRedirect])

  const handleSignOut = useCallback(() => {
    setUserId(null)
    setProfile(null)
    setTrack(null)
    setLiked(false)
    setReposted(false)
    setResult(null)
    setScreen('home')
    setError(null)
  }, [])

  const fetchRandomTrack = useCallback(async () => {
    const sdk = getSDK()
    setTrackLoading(true)
    setTrack(null)
    setResult(null)
    try {
      const res = await sdk.tracks.getTrendingTracks({
        limit: 20,
        offset: 0,
        time: 'week'
      })
      const list = res.data ?? []
      if (list.length > 0) {
        const randomIndex = Math.floor(Math.random() * list.length)
        const t = list[randomIndex]
        if (t) {
          setTrack({
            id: String(t.id ?? (t as { track_id?: string }).track_id ?? ''),
            title: t.title,
            user: t.user,
            playCount:
              (t as { play_count?: number }).play_count ??
              (t as { playCount?: number }).playCount
          })
          setLiked(false)
          setReposted(false)
        }
      }
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'response' in e && e.response && typeof (e.response as Response).text === 'function') {
        const res = e.response as Response
        try {
          const body = await res.text()
          setResult(`API error ${res.status}: ${body || res.statusText || 'Unknown'}`)
        } catch {
          setResult(`API error ${res.status}`)
        }
      } else {
        setResult(e instanceof Error ? e.message : 'Failed to fetch track')
      }
    } finally {
      setTrackLoading(false)
    }
  }, [])

  const handleLike = useCallback(async () => {
    if (!config.writeServerUrl || !userId || !track) return
    setLikeLoading(true)
    setResult(null)
    try {
      const action = liked ? 'unfavorite' : 'favorite'
      const res = await fetch(`${config.writeServerUrl}/like-repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, trackId: track.id, action })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setLiked(!liked)
        setResult(liked ? 'Unliked' : 'Liked!')
      } else {
        setResult(data?.error ?? `Error ${res.status}`)
      }
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLikeLoading(false)
    }
  }, [userId, track, liked])

  const handleRepost = useCallback(async () => {
    if (!config.writeServerUrl || !userId || !track) return
    setRepostLoading(true)
    setResult(null)
    try {
      const action = reposted ? 'unrepost' : 'repost'
      const res = await fetch(`${config.writeServerUrl}/like-repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, trackId: track.id, action })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setReposted(!reposted)
        setResult(reposted ? 'Unreposted' : 'Reposted!')
      } else {
        setResult(data?.error ?? `Error ${res.status}`)
      }
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setRepostLoading(false)
    }
  }, [userId, track, reposted])

  const handlePlayTrack = useCallback(async () => {
    if (!track) return
    try {
      if (playingTrackId === track.id && soundRef.current) {
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
      setPlayingTrackId(track.id)
      const sdk = getSDK()
      const streamUrl = await sdk.tracks.getTrackStreamUrl({ trackId: track.id })
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
  }, [track, playingTrackId])

  useEffect(() => {
    if (screen === 'signed-in' && userId && !track && !trackLoading) {
      fetchRandomTrack()
    }
  }, [screen, userId, track, trackLoading, fetchRandomTrack])

  if (screen === 'webview') {
    const state = oauthStateRef.current ?? randomState()
    oauthStateRef.current = state
    const oauthUrl = buildOAuthUrl({
      scope: 'write',
      redirectUri: REDIRECT_URI,
      state,
      responseMode: 'query',
      display: 'fullScreen',
      ...(config.apiKey ? { apiKey: config.apiKey } : { appName: 'LikeRepostExample' })
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
            if (req.url.startsWith(REDIRECT_URI) || req.url.startsWith('likerepost://oauth/callback')) {
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

  if (!config.isConfigured) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Like / Repost</Text>
          <Text style={styles.required}>
            Requires your server. Create a .env with:
          </Text>
          <Text style={styles.code}>EXPO_PUBLIC_AUDIUS_API_KEY=your_api_key</Text>
          <Text style={styles.code}>EXPO_PUBLIC_WRITE_SERVER_URL=http://localhost:3002</Text>
          <Text style={styles.required}>
            Run the server with AUDIUS_API_KEY and AUDIUS_BEARER_TOKEN. See README.
          </Text>
        </View>
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
          <Text style={styles.title}>Like / Repost a track</Text>
          <Text style={styles.subtitle}>
            Get a random trending track and like or repost it.
          </Text>
          <TouchableOpacity
            style={[styles.button, trackLoading && styles.buttonDisabled]}
            onPress={fetchRandomTrack}
            disabled={trackLoading}
          >
            {trackLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Get random track</Text>
            )}
          </TouchableOpacity>
          {track ? (
            <View style={styles.trackBlock}>
              <Text style={styles.trackTitle}>{track.title ?? 'Unknown'}</Text>
              <Text style={styles.trackArtist}>
                {track.user?.name ?? track.user?.handle ?? 'Unknown Artist'}
              </Text>
              <Text style={styles.trackPlays}>
                {(track.playCount ?? 0).toLocaleString()} plays
              </Text>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, playingTrackId === track.id && styles.actionBtnActive]}
                  onPress={handlePlayTrack}
                >
                  <Text style={styles.actionBtnText}>
                    {playingTrackId === track.id ? '⏹ Stop' : '▶ Play'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, liked && styles.actionBtnActive]}
                  onPress={handleLike}
                  disabled={likeLoading}
                >
                  {likeLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.actionBtnText}>{liked ? '❤️ Liked' : '🤍 Like'}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, reposted && styles.actionBtnActive]}
                  onPress={handleRepost}
                  disabled={repostLoading}
                >
                  {repostLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.actionBtnText}>{reposted ? '🔁 Reposted' : '🔄 Repost'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          {result ? <Text style={styles.result}>{result}</Text> : null}
        </View>
        <StatusBar style="auto" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Like / Repost</Text>
        <Text style={styles.subtitle}>
          Sign in with Audius (write scope) to authorize the app, then like or repost a track.
        </Text>
        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={handleOpenAuth}
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
  button: {
    backgroundColor: '#CC0FE0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  trackBlock: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  trackTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  trackArtist: { fontSize: 14, color: '#666', marginBottom: 4 },
  trackPlays: { fontSize: 12, color: '#999', marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#CC0FE0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center'
  },
  actionBtnActive: { backgroundColor: '#9a0bb3' },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  result: { fontSize: 13, color: '#333', marginTop: 12 },
  loader: { marginVertical: 16 },
  error: { color: '#d32f2f', marginTop: 12, fontSize: 13 },
  backBtn: { padding: 16 },
  backBtnText: { color: '#0066cc', fontSize: 16 },
  webview: { flex: 1 }
})
