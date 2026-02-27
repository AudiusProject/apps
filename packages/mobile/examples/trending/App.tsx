import { StatusBar } from 'expo-status-bar'
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
} from 'react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTrendingTracks } from './src/hooks/useTrendingTracks'

const queryClient = new QueryClient()

function TrendingScreen() {
  const { data: tracks, isPending, error } = useTrendingTracks()

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
      </View>
    )
  }

  const list = tracks ?? []

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trending on Audius</Text>
      <Text style={styles.subtitle}>SDK + Expo example</Text>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id ?? String(item.track_id ?? Math.random())}
        renderItem={({ item }) => (
          <View style={styles.trackItem}>
            <Text style={styles.trackTitle}>{item.title}</Text>
            <Text style={styles.trackArtist}>
              {item.user?.name ?? 'Unknown Artist'}
            </Text>
            <Text style={styles.trackPlays}>
              {item.playCount?.toLocaleString() ?? 0} plays
            </Text>
          </View>
        )}
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
  list: {
    padding: 16,
  },
  trackItem: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
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
