import { useCallback, useEffect, useState } from 'react'

import type { DecodedUserToken } from '@audius/sdk'
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

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<DecodedUserToken | null>(null)
  const [audioFile, setAudioFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null)
  const [coverUri, setCoverUri] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState<(typeof GENRES)[number]>('Electronic')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  // On mount: restore existing session.
  useEffect(() => {
    const sdk = getSDK()

    // Restore a previously authenticated session.
    sdk.oauth.isAuthenticated().then((authenticated) => {
      if (!authenticated) return
      setLoading(true)
      sdk.oauth
        .getUser()
        .then((user) => {
          setProfile(user)
          setScreen('signed-in')
        })
        .catch(() => {
          // Token expired — fall back to sign-in screen silently.
        })
        .finally(() => setLoading(false))
    })
  }, [])

  const handleSignIn = useCallback(async () => {
    const sdk = getSDK()
    setError(null)
    setLoading(true)
    try {
      // login() resolves after the full OAuth flow: expo-web-browser opens an
      // isolated auth session, captures the redirect, exchanges the code for
      // tokens, and settles the promise — no separate deep-link event needed.
      await sdk.oauth.login({
        scope: 'write',
        display: 'fullScreen'
      })
      const user = await sdk.oauth.getUser()
      setProfile(user)
      setScreen('signed-in')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    await getSDK()
      .oauth.logout()
      .catch(() => {})
    setProfile(null)
    setAudioFile(null)
    setCoverUri(null)
    setTitle('')
    setGenre('Electronic')
    setDescription('')
    setResult(null)
    setScreen('home')
    setError(null)
  }, [])

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
    setUploading(true)
    setResult(null)
    try {
      const sdk = getSDK()

      // Step 1 — upload audio
      setResult('Uploading audio...')
      const audioUpload = sdk.uploads.createAudioUpload({
        file: {
          uri: audioFile.uri,
          name: audioFile.name ?? 'audio',
          type: audioFile.mimeType ?? 'audio/mpeg'
        }
      })

      // Step 2 — upload cover art (optional)
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
        setResult('Audio upload did not return a track CID')
        return
      }

      // Step 3 — create the track using the OAuth access token stored in the SDK.
      setResult('Creating track...')
      const userId = String(profile.userId ?? profile.sub ?? '')
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
      setResult(`Track created! ID: ${res?.trackId ?? '—'}`)
    } catch (e) {
      setResult(await formatApiError(e))
    } finally {
      setUploading(false)
    }
  }, [profile, audioFile, coverUri, title, genre, description])

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
        <StatusBar style='auto' />
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
            <Text style={styles.handle}>
              @{profile.handle ?? profile.sub ?? 'user'}
            </Text>
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
            placeholder='Track title'
            placeholderTextColor='#888'
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
            placeholder='Description (optional)'
            placeholderTextColor='#888'
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
              <ActivityIndicator size='small' color='#fff' />
            ) : (
              <Text style={styles.buttonText}>Upload</Text>
            )}
          </TouchableOpacity>

          {result ? <Text style={styles.result}>{result}</Text> : null}
        </ScrollView>
        <StatusBar style='auto' />
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
          <ActivityIndicator size='large' style={styles.loader} />
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
      <StatusBar style='auto' />
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
  result: { marginTop: 16, fontSize: 13, color: '#555', lineHeight: 20 }
})
