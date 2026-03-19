import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Audio } from 'expo-av'
import { getSDK, config } from './src/sdk'

type Screen = 'home' | 'signed-in'

type Track = {
  id: string
  title?: string
  user?: { name?: string; handle?: string }
  playCount?: number
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ handle: string; userId: string } | null>(null)
  const [track, setTrack] = useState<Track | null>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [repostLoading, setRepostLoading] = useState(false)
  const [liked, setLiked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)

  const audiusSdk = getSDK()

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false
    })
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
            userId: String(user.userId ?? '')
          })
          setScreen('signed-in')
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
      setTrack(null)
      setResult(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    await audiusSdk.oauth.logout().catch(() => {})
    setProfile(null)
    setTrack(null)
    setLiked(false)
    setReposted(false)
    setResult(null)
    setScreen('home')
    setError(null)
  }, [])

  const fetchRandomTrack = useCallback(async () => {
    setTrackLoading(true)
    setTrack(null)
    setResult(null)
    try {
      const res = await audiusSdk.tracks.getTrendingTracks({
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
      const res = e && typeof e === 'object' && 'response' in e ? (e as { response: Response }).response : null
      const body = res && typeof res.text === 'function' ? await res.text().catch(() => '') : ''
      setResult(body ? `API error: ${body}` : e instanceof Error ? e.message : 'Failed to fetch track')
    } finally {
      setTrackLoading(false)
    }
  }, [])

  const handleLike = useCallback(async () => {
    if (!profile || !track) return
    setLikeLoading(true)
    setResult(null)
    try {
      if (liked) {
        await audiusSdk.tracks.unfavoriteTrack({ userId: profile.userId, trackId: track.id })
        setLiked(false)
        setResult('Unliked')
      } else {
        await audiusSdk.tracks.favoriteTrack({ userId: profile.userId, trackId: track.id })
        setLiked(true)
        setResult('Liked!')
      }
    } catch (e: unknown) {
      setResult(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLikeLoading(false)
    }
  }, [profile, track, liked])

  const handleRepost = useCallback(async () => {
    if (!profile || !track) return
    setRepostLoading(true)
    setResult(null)
    try {
      if (reposted) {
        await audiusSdk.tracks.unrepostTrack({ userId: profile.userId, trackId: track.id })
        setReposted(false)
        setResult('Unreposted')
      } else {
        await audiusSdk.tracks.repostTrack({ userId: profile.userId, trackId: track.id })
        setReposted(true)
        setResult('Reposted!')
      }
    } catch (e: unknown) {
      setResult(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setRepostLoading(false)
    }
  }, [profile, track, reposted])

  const handlePlayTrack = useCallback(async () => {
    if (!track) return
    try {
      const streamUrl = await audiusSdk.tracks.getTrackStreamUrl({ trackId: track.id })
      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: true }
      )
      setPlayingTrackId(track.id)
      await sound.setStatusAsync({ progressUpdateIntervalMillis: 500 })
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinishAndNotReset) {
          setPlayingTrackId(null)
        }
      })
    } catch {
      setPlayingTrackId(null)
    }
  }, [track])

  useEffect(() => {
    if (screen === 'signed-in' && profile && !track && !trackLoading) {
      fetchRandomTrack()
    }
  }, [screen, profile, track, trackLoading, fetchRandomTrack])

  if (!config.isConfigured) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Like / Repost</Text>
          <Text style={styles.required}>
            Create a .env with EXPO_PUBLIC_AUDIUS_API_KEY and register redirect
            URI: likerepost://oauth/callback
          </Text>
          <Text style={styles.code}>
            Get an API key at audius.co/settings → Developer Apps. No server needed — writes use OAuth from the device.
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
          <Text style={styles.title}>Like / Repost a track</Text>
          <Text style={styles.subtitle}>
            Get a random trending track and like or repost it (OAuth writes from the app).
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
          Sign in with Audius (write scope) to like or repost tracks directly from the app — no backend required.
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
  error: { color: '#d32f2f', marginTop: 12, fontSize: 13 }
})
