import { useCallback, useEffect, useRef, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { Audio } from 'expo-av'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { createSessionId } from '../shared/exampleDebug'
import { useTrendingTracks } from './src/hooks/useTrendingTracks'
import { getSDK } from './src/sdk'

const queryClient = new QueryClient()

function TrendingScreen() {
  const sessionIdRef = useRef(createSessionId())
  const { data: tracks, isPending, error } = useTrendingTracks()
  const [playingId, setPlayingId] = useState<string | null>(null)
  const soundRef = useRef<Audio.Sound | null>(null)

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

  const handlePlay = useCallback(async (item: { id?: string; track_id?: string; title?: string }) => {
    const trackId = item.id ?? String((item as { track_id?: string }).track_id ?? '')
    if (!trackId) return
    try {
      if (playingId === trackId && soundRef.current) {
        await soundRef.current.stopAsync()
        await soundRef.current.unloadAsync()
        soundRef.current = null
        setPlayingId(null)
        return
      }
      if (soundRef.current) {
        await soundRef.current.unloadAsync()
        soundRef.current = null
      }
      setPlayingId(trackId)
      const sdk = getSDK()
      const streamUrl = await sdk.tracks.getTrackStreamUrl({ trackId })
      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: true }
      )
      soundRef.current = sound
      await sound.setStatusAsync({ progressUpdateIntervalMillis: 500 })
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinishAndNotReset) {
          setPlayingId(null)
          soundRef.current = null
        }
      })
    } catch {
      setPlayingId(null)
    }
  }, [playingId])

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading trending tracks...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Error: {error instanceof Error ? error.message : String(error)}
        </Text>
        <Text style={styles.sessionHint} selectable>
          Session: {sessionIdRef.current} (check Metro logs for requestId)
        </Text>
      </View>
    )
  }

  const list = tracks ?? []

  const trackIdForItem = (item: { id?: string; track_id?: string }) =>
    item.id ?? String((item as { track_id?: string }).track_id ?? '')

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trending on Audius</Text>
      <Text style={styles.subtitle}>SDK + Expo example</Text>
      <Text style={styles.sessionHint} selectable>
        Session: {sessionIdRef.current}
      </Text>
      <FlatList
        data={list}
        keyExtractor={(item) => trackIdForItem(item) || String(Math.random())}
        renderItem={({ item }) => {
          const id = trackIdForItem(item)
          const isPlaying = id ? playingId === id : false
          return (
            <View style={styles.trackItem}>
              <View style={styles.trackItemContent}>
                <View style={styles.trackItemText}>
                  <Text style={styles.trackTitle}>{item.title}</Text>
                  <Text style={styles.trackArtist}>
                    {item.user?.name ?? 'Unknown Artist'}
                  </Text>
                  <Text style={styles.trackPlays}>
                    {item.playCount?.toLocaleString() ?? 0} plays
                  </Text>
                </View>
                {id ? (
                  <TouchableOpacity
                    style={[styles.playBtn, isPlaying && styles.playBtnActive]}
                    onPress={() => handlePlay(item)}
                  >
                    <Text style={styles.playBtnText}>{isPlaying ? '⏹' : '▶'}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )
        }}
        contentContainerStyle={styles.list}
      />
      <StatusBar style="auto" />
    </View>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TrendingScreen />
    </QueryClientProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
  sessionHint: {
    marginTop: 12,
    fontSize: 11,
    color: '#888',
    fontFamily: 'monospace',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  list: {
    padding: 16,
  },
  trackItem: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  trackItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackItemText: { flex: 1 },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#CC0FE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  playBtnActive: { backgroundColor: '#9a0bb3' },
  playBtnText: { fontSize: 18, color: '#fff' },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  trackPlays: {
    fontSize: 12,
    color: '#999',
  },
})
