import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { WebView } from 'react-native-webview'
import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { buildOAuthUrl, randomState } from './src/oauth/buildOAuthUrl'
import { getSDK } from './src/sdk'
import { config } from './src/config'

const REDIRECT_URI = 'http://localhost/oauth/callback'
const REDIRECT_URI_OR_SCHEME = REDIRECT_URI

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

type Screen = 'home' | 'webview' | 'signed-in'

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
  const [profile, setProfile] = useState<{ handle: string; userId: string } | null>(null)
  const [audioFile, setAudioFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null)
  const [coverUri, setCoverUri] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState<(typeof GENRES)[number]>('Electronic')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const oauthStateRef = useRef<string | null>(null)

  const handleOpenAuth = useCallback(() => {
    setError(null)
    const state = randomState()
    oauthStateRef.current = state
    setScreen('webview')
  }, [])

  const handleRedirect = useCallback(async (url: string) => {
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
      if (data) {
        const userId = String(data.userId ?? data.sub ?? '')
        setProfile({
          handle: data.handle ?? data.sub ?? 'Unknown',
          userId
        })
        setScreen('signed-in')
        setResult(null)
      } else {
        setError('Invalid token')
      }
    } catch (e: unknown) {
      setError(await formatApiError(e))
    } finally {
      setLoading(false)
    }
  }, [])

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      })
      if (res.canceled) return
      const uri = res.assets[0]?.uri
      setCoverUri(uri ?? null)
      setResult(null)
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Failed to pick cover')
    }
  }, [])

  const handleUpload = useCallback(async () => {
    if (!config.writeServerUrl || !profile) return
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
      const audioFileForSdk = {
        uri: audioFile.uri,
        name: audioFile.name ?? 'audio',
        type: audioFile.mimeType ?? 'audio/mpeg'
      }
      const imageFileForSdk = coverUri
        ? { uri: coverUri, name: 'cover.jpg', type: 'image/jpeg' as const }
        : undefined
      setResult('Uploading audio...')
      const task = sdk.tracks.uploadTrackFiles({
        audioFile: audioFileForSdk,
        imageFile: imageFileForSdk
      })
      const { audioUploadResponse, imageUploadResponse } = await task.start()
      if (!audioUploadResponse?.results?.['320']) {
        setResult('Audio upload did not return track CID')
        return
      }
      setResult('Creating track...')
      const res = await fetch(`${config.writeServerUrl}/create-track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          metadata: {
            title: title.trim(),
            genre,
            trackCid: audioUploadResponse.results['320'],
            description: description.trim() || undefined,
            duration:
              parseInt(audioUploadResponse.probe?.format?.duration ?? '0', 10) || undefined,
            origFileCid: audioUploadResponse.orig_file_cid,
            origFilename: audioUploadResponse.orig_filename,
            coverArtCid: imageUploadResponse?.orig_file_cid,
            isUnlisted: true
          }
        })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setResult(`Track created! ID: ${data.trackId ?? '—'}`)
      } else {
        setResult(data?.error ?? `Error ${res.status}`)
      }
    } catch (e) {
      setResult(await formatApiError(e))
    } finally {
      setUploading(false)
    }
  }, [profile, audioFile, title, genre, description, coverUri])

  if (screen === 'webview') {
    const state = oauthStateRef.current ?? randomState()
    oauthStateRef.current = state
    const oauthUrl = buildOAuthUrl({
      scope: 'write',
      redirectUri: REDIRECT_URI,
      state,
      responseMode: 'query',
      display: 'fullScreen',
      ...(config.apiKey ? { apiKey: config.apiKey } : { appName: 'UploadExample' })
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

  if (!config.isConfigured) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Upload track</Text>
          <Text style={styles.required}>
            Requires your server. Create a .env with:
          </Text>
          <Text style={styles.code}>EXPO_PUBLIC_AUDIUS_API_KEY=your_api_key</Text>
          <Text style={styles.code}>EXPO_PUBLIC_WRITE_SERVER_URL=http://localhost:3003</Text>
          <Text style={styles.required}>
            Run the server with AUDIUS_API_KEY and AUDIUS_BEARER_TOKEN. See README.
          </Text>
        </View>
        <StatusBar style="auto" />
      </View>
    )
  }

  if (screen === 'signed-in' && profile) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.profileRow}>
            <Text style={styles.profileHandle}>@{profile.handle}</Text>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Text style={styles.signOutBtnText}>Sign out</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Upload track</Text>
          <Text style={styles.subtitle}>
            Pick an audio file and add metadata. Server creates the track with your app bearer.
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
                style={[styles.genreChip, genre === g && styles.genreChipActive]}
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

          {result ? (
            <Text style={styles.result}>{result}</Text>
          ) : null}
        </ScrollView>
        <StatusBar style="auto" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.title}>Audius Upload</Text>
        <Text style={styles.subtitle}>
          Sign in with Audius (write scope) to authorize the app, then upload a track.
        </Text>
        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={handleOpenAuth}
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
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
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
  backBtn: { padding: 16 },
  backBtnText: { color: '#0066cc', fontSize: 16 },
  webview: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 48 },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  profileHandle: { fontSize: 16, color: '#333' },
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
  result: {
    marginTop: 16,
    fontSize: 13,
    color: '#555',
    lineHeight: 20
  },
  required: { fontSize: 13, color: '#333', marginTop: 12 },
  code: { fontFamily: 'monospace', fontSize: 12, color: '#555', marginTop: 6 },
  card: { margin: 24, padding: 24, backgroundColor: '#f5f5f5', borderRadius: 12 }
})
