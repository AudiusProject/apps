import { useCallback, useEffect, useRef, useState } from 'react'

import { type User } from '@audius/sdk'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { StatusBar } from 'expo-status-bar'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

import {
  createSessionId,
  formatErrorForDebug,
  newOperationId
} from '../shared/exampleDebug'
import { config } from './src/config'
import { getSDK } from './src/sdk'

const GENRES = [
  'Electronic',
  'Rock',
  'Hip-Hop/Rap',
  'Pop',
  'R&B/Soul',
  'Alternative',
  'Country',
  'Jazz',
  'Folk',
  'Classical'
] as const

type Screen = 'home' | 'signed-in'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<User | null>(null)
  const [audioFile, setAudioFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null)
  const [coverUri, setCoverUri] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState<(typeof GENRES)[number]>('Electronic')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [debugLogs, setDebugLogs] = useState<string[]>([])

  const sessionIdRef = useRef(createSessionId())
  const opIdRef = useRef(`boot-${newOperationId()}`)

  const sdk = getSDK()

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
    console.log(`[upload] ${line}`)
    setDebugLogs((prev) => [...prev.slice(-79), line])
  }, [])

  // On mount: restore existing session.
  useEffect(() => {
    opIdRef.current = `restore-${newOperationId()}`
    logDebug('Checking existing OAuth session')
    sdk.oauth.isAuthenticated().then((authenticated) => {
      logDebug('oauth.isAuthenticated resolved', { authenticated })
      if (!authenticated) return
      setLoading(true)
      sdk.oauth
        .getUser()
        .then((user) => {
          setProfile(user ?? null)
          setScreen('signed-in')
          logDebug('oauth.getUser succeeded (session restore)', {
            handle: user.handle,
            id: user.id
          })
        })
        .catch(async (e) => {
          console.error('Failed to get user', e)
          const details = await formatErrorForDebug(e)
          logDebug('Session restore failed', details)
        })
        .finally(() => setLoading(false))
    })
  }, [sdk.oauth, logDebug])

  const handleSignIn = useCallback(async () => {
    opIdRef.current = `signin-${newOperationId()}`
    setError(null)
    setLoading(true)
    try {
      logDebug('Starting oauth.login')
      await sdk.oauth.login({
        scope: 'write',
        display: 'fullScreen'
      })
      logDebug('oauth.login succeeded')
      const user = await sdk.oauth.getUser()
      logDebug('oauth.getUser succeeded', { handle: user.handle, id: user.id })
      setProfile(user)
      setScreen('signed-in')
    } catch (e: unknown) {
      const details = await formatErrorForDebug(e)
      logDebug('Sign-in flow failed', details)
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }, [sdk.oauth, logDebug])

  const handleSignOut = useCallback(async () => {
    logDebug('Starting oauth.logout')
    await sdk.oauth.logout().catch(() => {})
    logDebug('oauth.logout completed')
    setProfile(null)
    setAudioFile(null)
    setCoverUri(null)
    setTitle('')
    setGenre('Electronic')
    setDescription('')
    setResult(null)
    setScreen('home')
    setError(null)
  }, [sdk.oauth, logDebug])

  const pickAudio = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true
      })
      if (res.canceled) return
      setAudioFile(res.assets[0] ?? null)
      setResult(null)
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Failed to pick audio')
    }
  }, [])

  const pickCover = useCallback(async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      })
      if (res.canceled) return
      setCoverUri(res.assets[0]?.uri ?? null)
      setResult(null)
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Failed to pick cover')
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!profile) return
    if (!audioFile) {
      setResult('Please select an audio file')
      return
    }
    if (!title.trim()) {
      setResult('Please enter a title')
      return
    }
    opIdRef.current = `upload-${newOperationId()}`
    setUploading(true)
    setResult(null)
    try {
      logDebug('Starting upload flow', { userId: profile.id, title: title.trim() })

      setResult('Uploading audio...')
      const audioUpload = sdk.uploads.createAudioUpload({
        file: {
          uri: audioFile.uri,
          name: audioFile.name ?? 'audio',
          type: audioFile.mimeType ?? 'audio/mpeg'
        }
      })

      const imageUpload = coverUri
        ? sdk.uploads.createImageUpload({
            file: { uri: coverUri, name: 'cover.jpg', type: 'image/jpeg' }
          })
        : undefined

      if (coverUri) setResult('Uploading cover art...')
      const [audioResult, coverArtSizes] = await Promise.all([
        audioUpload.start(),
        imageUpload?.start()
      ])

      if (!audioResult.trackCid) {
        logDebug('Audio upload missing trackCid')
        setResult('Audio upload did not return a track CID')
        return
      }

      setResult('Creating track...')
      const userId = String(profile.id ?? '')
      const res = await sdk.tracks.createTrack({
        userId,
        metadata: {
          title: title.trim(),
          genre,
          ...audioResult,
          trackCid: audioResult.trackCid,
          description: description.trim() || undefined,
          coverArtSizes
        }
      })
      logDebug('tracks.createTrack succeeded', { trackId: res?.trackId })
      setResult(`Track created! ID: ${res?.trackId ?? '—'}`)
    } catch (e: unknown) {
      const details = await formatErrorForDebug(e)
      logDebug('Upload / createTrack failed', details)
      const rid =
        typeof details.requestId === 'string' ? ` (requestId: ${details.requestId})` : ''
      setResult(
        `${details.message ?? (e instanceof Error ? e.message : 'Request failed')}${rid}`
      )
    } finally {
      setUploading(false)
    }
  }, [profile, audioFile, coverUri, title, genre, description, sdk, logDebug])

  if (!config.isConfigured) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>OAuth Upload</Text>
          <Text style={styles.body}>
            Requires an Audius developer app API key.
          </Text>
          <Text style={styles.body}>Create a .env file with:</Text>
          <Text style={styles.code}>
            EXPO_PUBLIC_AUDIUS_API_KEY=your_api_key
          </Text>
          <Text style={styles.body}>
            Get one at audius.co/settings → Developer Apps.
          </Text>
        </View>
        <StatusBar style="auto" />
      </View>
    )
  }

  if (screen === 'signed-in' && profile) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.profileRow}>
            <Text style={styles.handle}>@{profile.handle ?? 'user'}</Text>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Text style={styles.signOutBtnText}>Sign out</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Upload track</Text>
          <Text style={styles.subtitle}>
            Pick an audio file and add metadata. The track is created directly
            via the OAuth access token — no backend server needed.
          </Text>

          <TouchableOpacity style={styles.pickBtn} onPress={pickAudio}>
            <Text style={styles.pickBtnText}>
              {audioFile
                ? `Audio: ${audioFile.name ?? 'Selected'}`
                : 'Pick audio file'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pickBtn} onPress={pickCover}>
            <Text style={styles.pickBtnText}>
              {coverUri ? 'Cover art selected' : 'Pick cover art (optional)'}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Track title"
            placeholderTextColor="#888"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Genre</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.genreScroll}
          >
            {GENRES.map((g) => (
              <TouchableOpacity
                key={g}
                style={[
                  styles.genreChip,
                  genre === g && styles.genreChipActive
                ]}
                onPress={() => setGenre(g)}
              >
                <Text
                  style={[
                    styles.genreChipText,
                    genre === g && styles.genreChipTextActive
                  ]}
                >
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optional)"
            placeholderTextColor="#888"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.button, uploading && styles.buttonDisabled]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Upload</Text>
            )}
          </TouchableOpacity>

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
        </ScrollView>
        <StatusBar style="auto" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Audius OAuth Upload</Text>
        <Text style={styles.subtitle}>
          Sign in with Audius (write scope) — uploads and track creation happen
          entirely on-device using the OAuth access token.
        </Text>
        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Sign in with Audius</Text>
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
  card: {
    margin: 24,
    padding: 24,
    backgroundColor: '#f5f5f5',
    borderRadius: 12
  },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  body: { fontSize: 13, color: '#333', marginTop: 8 },
  code: { fontFamily: 'monospace', fontSize: 12, color: '#555', marginTop: 6 },
  button: {
    backgroundColor: '#CC0FE0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'center'
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loader: { marginVertical: 16 },
  error: { color: '#d32f2f', marginTop: 12 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  handle: { fontSize: 16, color: '#333' },
  signOutBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  signOutBtnText: { color: '#0066cc', fontSize: 16 },
  pickBtn: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12
  },
  pickBtnText: { fontSize: 14, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8, color: '#333' },
  genreScroll: { marginBottom: 16, maxHeight: 44 },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8
  },
  genreChipActive: { backgroundColor: '#CC0FE0' },
  genreChipText: { fontSize: 14, color: '#333' },
  genreChipTextActive: { color: '#fff', fontWeight: '600' },
  result: { marginTop: 16, fontSize: 13, color: '#555', lineHeight: 20 },
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
