import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
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
  const [profile, setProfile] = useState<User | null>(null)
  const [track, setTrack] = useState<Track | null>(null)
  const [trackLoading, setTrackLoading] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [repostLoading, setRepostLoading] = useState(false)
  const [liked, setLiked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
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
    console.log(`[like-repost] ${line}`)
    setDebugLogs((prev) => [...prev.slice(-79), line])
  }, [])

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
          logDebug('oauth.getUser succeeded (session restore)', { handle: user.handle, id: user.id })
          setProfile(user)
          setScreen('signed-in')
        })
        .catch(async (e) => {
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
      await audiusSdk.oauth.login({ scope: 'write', display: 'fullScreen' })
      logDebug('oauth.login succeeded')
      const user = await audiusSdk.oauth.getUser()
      logDebug('oauth.getUser succeeded', { handle: user.handle, id: user.id })
      setProfile(user)
      setScreen('signed-in')
      setTrack(null)
      setResult(null)
    } catch (e: unknown) {
      const details = await formatErrorForDebug(e)
      logDebug('Sign-in flow failed', details)
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }, [audiusSdk.oauth, logDebug])

  const handleSignOut = useCallback(async () => {
    logDebug('Starting oauth.logout')
    await audiusSdk.oauth.logout().catch(() => {})
    logDebug('oauth.logout completed')
    setProfile(null)
    setTrack(null)
    setLiked(false)
    setReposted(false)
    setResult(null)
    setScreen('home')
    setError(null)
  }, [audiusSdk.oauth, logDebug])

  const fetchRandomTrack = useCallback(async () => {
    opIdRef.current = `trending-${newOperationId()}`
    setTrackLoading(true)
    setTrack(null)
    setResult(null)
    try {
      logDebug('Calling tracks.getTrendingTracks')
      const res = await audiusSdk.tracks.getTrendingTracks({
        limit: 20,
        offset: 0,
        time: 'week'
      })
      logDebug('tracks.getTrendingTracks resolved', { count: res.data?.length ?? 0 })
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
      const details = await formatErrorForDebug(e)
      logDebug('tracks.getTrendingTracks failed', details)
      setResult(
        typeof details.requestId === 'string'
          ? `API error (requestId: ${details.requestId})`
          : e instanceof Error
            ? e.message
            : 'Failed to fetch track'
      )
    } finally {
      setTrackLoading(false)
    }
  }, [audiusSdk.tracks, logDebug])

  const handleLike = useCallback(async () => {
    if (!profile || !track) return
    opIdRef.current = `like-${newOperationId()}`
    setLikeLoading(true)
    setResult(null)
    try {
      logDebug(liked ? 'Calling unfavoriteTrack' : 'Calling favoriteTrack', {
        userId: profile.id,
        trackId: track.id
      })
      if (liked) {
        await audiusSdk.tracks.unfavoriteTrack({ userId: profile.id, trackId: track.id })
        setLiked(false)
        setResult('Unliked')
      } else {
        await audiusSdk.tracks.favoriteTrack({ userId: profile.id, trackId: track.id })
        setLiked(true)
        setResult('Liked!')
      }
      logDebug('favorite/unfavorite succeeded')
    } catch (e: unknown) {
      const details = await formatErrorForDebug(e)
      logDebug('favorite/unfavorite failed', details)
      setResult(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLikeLoading(false)
    }
  }, [profile, track, liked, audiusSdk.tracks, logDebug])

  const handleRepost = useCallback(async () => {
    if (!profile || !track) return
    opIdRef.current = `repost-${newOperationId()}`
    setRepostLoading(true)
    setResult(null)
    try {
      logDebug(reposted ? 'Calling unrepostTrack' : 'Calling repostTrack', {
        userId: profile.id,
        trackId: track.id
      })
      if (reposted) {
        await audiusSdk.tracks.unrepostTrack({ userId: profile.id, trackId: track.id })
        setReposted(false)
        setResult('Unreposted')
      } else {
        await audiusSdk.tracks.repostTrack({ userId: profile.id, trackId: track.id })
        setReposted(true)
        setResult('Reposted!')
      }
      logDebug('repost/unrepost succeeded')
    } catch (e: unknown) {
      const details = await formatErrorForDebug(e)
      logDebug('repost/unrepost failed', details)
      setResult(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setRepostLoading(false)
    }
  }, [profile, track, reposted, audiusSdk.tracks, logDebug])

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
  }, [track, audiusSdk.tracks])

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
            <Text style={styles.handle}>@{profile.handle ?? 'user'}</Text>
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
  error: { color: '#d32f2f', marginTop: 12, fontSize: 13 },
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
  debugLine: { fontSize: 11, color: '#ddd', marginBottom: 4 }
})
