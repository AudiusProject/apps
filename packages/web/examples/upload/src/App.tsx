import { useCallback, useEffect, useRef, useState } from 'react'

import type { DecodedUserToken } from '@audius/sdk'

import { config } from './config'
import { getSDK } from './sdk'

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
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState<(typeof GENRES)[number]>('Electronic')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // On mount: restore an existing session or handle an OAuth popup callback.
  useEffect(() => {
    const sdk = getSDK()

    // If the URL contains ?code=&state=, this page is returning from an OAuth
    // redirect. handleRedirect() handles both cases:
    //   - popup:      window.opener exists → forwards the code to the parent
    //                 and closes the popup. login() in the parent resolves.
    //   - fullScreen: no opener → performs the PKCE exchange locally and
    //                 stores the tokens. Call getUser() afterwards to get the
    //                 profile.
    if (sdk.oauth.hasRedirectResult()) {
      setLoading(true)
      sdk.oauth
        .handleRedirect()
        .then(() => sdk.oauth.getUser())
        .then((user) => {
          setProfile(user)
          setScreen('signed-in')
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : 'Sign-in failed')
        })
        .finally(() => setLoading(false))
      return
    }

    // Otherwise, if a session is already stored from a previous login, restore
    // the profile via getUser() so the user doesn't have to sign in again.
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
          // Token may be expired — silently fall back to the sign-in screen.
        })
        .finally(() => setLoading(false))
    })
  }, [])

  const handleSignIn = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const sdk = getSDK()
      // login opens a popup pointing to the Audius consent screen. The popup
      // redirects to redirectUri (set in SDK config) after the user approves.
      // handleRedirect() on that page detects window.opener, forwards the
      // auth code back to this window, and closes the popup.
      //
      // To use a full-page redirect instead, change display to 'fullScreen'.
      // login will navigate away; handleRedirect() on the next mount will
      // complete the exchange and restore the signed-in state.
      await sdk.oauth.login({
        scope: 'write',
        display: 'popup'
      })
      const p = await sdk.oauth.getUser()
      setProfile(p)
      setScreen('signed-in')
      setResult(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    const sdk = getSDK()
    await sdk.oauth.logout().catch(() => {})
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

  const onAudioChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) setAudioFile(f)
      setResult(null)
    },
    []
  )

  const onCoverChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) setCoverFile(f)
      setResult(null)
    },
    []
  )

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
      const audioUpload = sdk.uploads.createAudioUpload({ file: audioFile })

      // Step 2 — upload cover art (optional)
      if (coverFile) setResult('Uploading cover art...')
      const imageUpload = coverFile
        ? sdk.uploads.createImageUpload({ file: coverFile })
        : undefined

      // Uploads can be done in parallel since they are independent, so start them both before awaiting either.
      const [audioResult, coverArtSizes] = await Promise.all([
        audioUpload.start(),
        imageUpload?.start()
      ])

      if (!audioResult.trackCid) {
        setResult('Audio upload did not return a track CID')
        return
      }

      // Step 3 — create the track on-chain using the OAuth access token
      // stored in the SDK's internal tokenStore by the PKCE login above.
      setResult('Creating track...')
      const userId = String(profile.userId ?? profile.sub ?? '')
      const res = await sdk.tracks.createTrack({
        userId,
        metadata: {
          title: title.trim(),
          genre,
          // createAudioUpload result fields match createTrack metadata names
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
  }, [profile, audioFile, coverFile, title, genre, description])

  if (!config.isConfigured) {
    return (
      <div className='center'>
        <div className='card'>
          <h1 className='title'>OAuth Upload</h1>
          <p className='required'>Requires an Audius developer app API key.</p>
          <p className='required'>
            Create a <code>.env</code> file with:
          </p>
          <p className='code'>VITE_AUDIUS_API_KEY=your_api_key</p>
          <p className='required'>
            Get an API key at{' '}
            <strong>audius.co/settings → Developer Apps</strong>.
          </p>
        </div>
      </div>
    )
  }

  if (screen === 'signed-in' && profile) {
    return (
      <div className='container'>
        <div className='card'>
          <div className='profileRow'>
            <span className='handle'>
              @{profile.handle ?? profile.sub ?? 'user'}
            </span>
            <button
              type='button'
              className='signOutBtn'
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
          <h1 className='title'>Upload track</h1>
          <p className='subtitle'>
            Pick an audio file and add metadata. The track is created directly
            via the OAuth access token — no backend server needed.
          </p>

          <input
            ref={audioInputRef}
            type='file'
            accept='audio/*'
            style={{ display: 'none' }}
            onChange={onAudioChange}
          />
          <input
            ref={coverInputRef}
            type='file'
            accept='image/*'
            style={{ display: 'none' }}
            onChange={onCoverChange}
          />

          <button type='button' className='pickBtn' onClick={pickAudio}>
            {audioFile ? `Audio: ${audioFile.name}` : 'Pick audio file'}
          </button>

          <button type='button' className='pickBtn' onClick={pickCover}>
            {coverFile
              ? `Cover: ${coverFile.name}`
              : 'Pick cover art (optional)'}
          </button>

          <input
            className='input'
            type='text'
            placeholder='Track title'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <p className='label'>Genre</p>
          <div className='genreScroll'>
            {GENRES.map((g) => (
              <button
                key={g}
                type='button'
                className={`genreChip ${genre === g ? 'genreChipActive' : ''}`}
                onClick={() => setGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>

          <textarea
            className='input textArea'
            placeholder='Description (optional)'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          <button
            type='button'
            className='button'
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <span
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <span
                  className='spinner'
                  style={{ width: 20, height: 20, borderWidth: 2 }}
                  aria-hidden
                />
                {result ?? 'Uploading...'}
              </span>
            ) : (
              'Upload'
            )}
          </button>

          {result && !uploading ? <p className='result'>{result}</p> : null}
        </div>
      </div>
    )
  }

  return (
    <div className='center'>
      <div className='card'>
        <h1 className='title'>Audius OAuth Upload</h1>
        <p className='subtitle'>
          Sign in with Audius (write scope) — uploads and track creation happen
          entirely in the browser using the OAuth access token.
        </p>
        {loading ? (
          <div className='loader'>
            <div className='spinner' aria-hidden />
          </div>
        ) : (
          <button
            type='button'
            className='button'
            onClick={handleSignIn}
            disabled={loading}
          >
            Sign in with Audius
          </button>
        )}
        {error ? <p className='error'>{error}</p> : null}
      </div>
    </div>
  )
}
