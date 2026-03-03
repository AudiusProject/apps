import { useCallback, useEffect, useRef, useState } from 'react'
import { buildOAuthUrl, randomState } from './oauth/buildOAuthUrl'
import { getSDK } from './sdk'
import { config } from './config'

const OAUTH_CALLBACK_PATH = '/oauth/callback'

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
  const [profile, setProfile] = useState<{ handle: string; userId: string } | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState<(typeof GENRES)[number]>('Electronic')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const completeSignIn = useCallback(
    async (resolvedToken: string) => {
      setLoading(true)
      setError(null)
      try {
        const verifyRes = await getSDK().users.verifyIDToken({ token: resolvedToken })
        const data = verifyRes.data
        if (!data) {
          setError('Invalid token')
          return
        }
        const uid = String(data.userId ?? data.sub ?? '')
        setProfile({ handle: data.handle ?? data.sub ?? 'Unknown', userId: uid })
        setScreen('signed-in')
        setResult(null)
      } catch (e: unknown) {
        if (
          e &&
          typeof e === 'object' &&
          'response' in e &&
          (e as { response?: Response }).response &&
          typeof ((e as { response: Response }).response as Response).text === 'function'
        ) {
          const res = (e as { response: Response }).response
          try {
            const body = await res.text()
            setError(`API error ${res.status}: ${body || res.statusText || 'Unknown'}`)
          } catch {
            setError(`API error ${res.status}`)
          }
        } else {
          setError(e instanceof Error ? (e as Error).message : 'Sign-in failed')
        }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const handleRedirect = useCallback(async () => {
    if (typeof window === 'undefined') return
    const { pathname, search } = window.location
    if (pathname !== OAUTH_CALLBACK_PATH) return

    const params = new URLSearchParams(search)
    const token = params.get('token') ?? params.get('access_token')
    const fragment = window.location.hash
    const tokenFromFragment = fragment ? fragment.split('token=')[1]?.split('&')[0] : null
    const resolvedToken = token ?? tokenFromFragment
    const state = params.get('state') ?? (fragment ? fragment.split('state=')[1]?.split('&')[0] : null)

    const storedState = sessionStorage.getItem('oauth_state')
    sessionStorage.removeItem('oauth_state')
    window.history.replaceState({}, '', '/')

    if (!resolvedToken) {
      setError('No token in redirect')
      return
    }
    if (state !== storedState) {
      setError('State mismatch')
      return
    }

    if (window.opener) {
      window.opener.postMessage(
        { type: 'audius-oauth-callback', token: resolvedToken },
        window.location.origin
      )
      window.close()
      return
    }

    await completeSignIn(resolvedToken)
  }, [completeSignIn])

  useEffect(() => {
    handleRedirect()
  }, [handleRedirect])

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const data = event.data
      if (data?.type === 'audius-oauth-callback' && typeof data.token === 'string') {
        await completeSignIn(data.token)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [completeSignIn])

  const handleOpenAuth = useCallback(() => {
    setError(null)
    const state = randomState()
    sessionStorage.setItem('oauth_state', state)
    const redirectUri = `${window.location.origin}${OAUTH_CALLBACK_PATH}`
    const oauthUrl = buildOAuthUrl({
      scope: 'write',
      redirectUri,
      state,
      responseMode: 'query',
      display: 'popup',
      ...(config.apiKey ? { apiKey: config.apiKey } : { appName: 'UploadExample' })
    })
    const w = 500
    const h = 600
    const left = Math.round((window.screen.width - w) / 2)
    const top = Math.round((window.screen.height - h) / 2)
    const popup = window.open(oauthUrl, 'audius-oauth', `width=${w},height=${h},left=${left},top=${top}`)
    if (!popup) {
      window.location.href = buildOAuthUrl({
        scope: 'write',
        redirectUri,
        state,
        responseMode: 'query',
        display: 'fullScreen',
        ...(config.apiKey ? { apiKey: config.apiKey } : { appName: 'UploadExample' })
      })
    }
  }, [])

  const handleSignOut = useCallback(() => {
    setProfile(null)
    setAudioFile(null)
    setCoverFile(null)
    setTitle('')
    setGenre('Electronic')
    setDescription('')
    setResult(null)
    setScreen('home')
    setError(null)
  }, [])

  const pickAudio = useCallback(() => {
    audioInputRef.current?.click()
  }, [])

  const pickCover = useCallback(() => {
    coverInputRef.current?.click()
  }, [])

  const onAudioChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setAudioFile(f)
    setResult(null)
  }, [])

  const onCoverChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setCoverFile(f)
    setResult(null)
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
      const imageFileForSdk = coverFile ?? undefined
      setResult('Uploading audio...')
      const task = sdk.tracks.uploadTrackFiles({
        audioFile,
        imageFile: imageFileForSdk
      })
      const { audioUploadResponse, imageUploadResponse } = await task.start()
      if (!audioUploadResponse?.results?.['320']) {
        setResult('Audio upload did not return track CID')
        return
      }
      setResult('Creating track...')
      const duration = parseFloat(audioUploadResponse.probe?.format?.duration ?? '0') || undefined
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
            duration: duration ? Math.round(duration) : undefined,
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
  }, [profile, audioFile, coverFile, title, genre, description])

  if (!config.isConfigured) {
    return (
      <div className="center">
        <div className="card">
          <h1 className="title">Upload track</h1>
          <p className="required">Requires your server. Create a .env with:</p>
          <p className="code">VITE_AUDIUS_API_KEY=your_api_key</p>
          <p className="code">VITE_WRITE_SERVER_URL=http://localhost:3003</p>
          <p className="required">
            Run the server with AUDIUS_API_KEY and AUDIUS_BEARER_TOKEN. See README.
          </p>
        </div>
      </div>
    )
  }

  if (screen === 'signed-in' && profile) {
    return (
      <div className="container">
        <div className="card">
          <div className="profileRow">
            <span className="handle">@{profile.handle}</span>
            <button type="button" className="signOutBtn" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
          <h1 className="title">Upload track</h1>
          <p className="subtitle">
            Pick an audio file and add metadata. Server creates the track with your app bearer.
          </p>

          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={onAudioChange}
          />
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={onCoverChange}
          />

          <button type="button" className="pickBtn" onClick={pickAudio}>
            {audioFile ? `Audio: ${audioFile.name}` : 'Pick audio file'}
          </button>

          <button type="button" className="pickBtn" onClick={pickCover}>
            {coverFile ? `Cover: ${coverFile.name}` : 'Pick cover art (optional)'}
          </button>

          <input
            className="input"
            type="text"
            placeholder="Track title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <p className="label">Genre</p>
          <div className="genreScroll">
            {GENRES.map((g) => (
              <button
                key={g}
                type="button"
                className={`genreChip ${genre === g ? 'genreChipActive' : ''}`}
                onClick={() => setGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>

          <textarea
            className="input textArea"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          <button
            type="button"
            className="button"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} aria-hidden />
                Uploading...
              </span>
            ) : (
              'Upload'
            )}
          </button>

          {result ? <p className="result">{result}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="center">
      <div className="card">
        <h1 className="title">Audius Upload</h1>
        <p className="subtitle">
          Sign in with Audius (write scope) to authorize the app, then upload a track.
        </p>
        {loading ? (
          <div className="loader">
            <div className="spinner" aria-hidden />
          </div>
        ) : (
          <button
            type="button"
            className="button"
            onClick={handleOpenAuth}
            disabled={loading}
          >
            Sign in with Audius
          </button>
        )}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </div>
  )
}
