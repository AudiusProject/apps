import { useCallback, useEffect, useState } from 'react'

import type { User } from '@audius/sdk'

import { config } from '../config'
import { getSDK } from '../sdk'
import type { TrackPreview } from '../types'

type Props = {
  navigate: (path: string) => void
}

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

export function Home({ navigate }: Props) {
  const [profile, setProfile] = useState<User | null>(null)
  const [oldHandle, setOldHandle] = useState('')
  const [tracks, setTracks] = useState<TrackPreview[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sdkInstance = getSDK()

    if (sdkInstance.oauth.hasRedirectResult()) {
      setLoading(true)
      sdkInstance.oauth
        .handleRedirect()
        .then(() => sdkInstance.oauth.getUser())
        .then((user) => setProfile(user))
        .catch(async (e) => setError(await formatApiError(e)))
        .finally(() => setLoading(false))
      return
    }

    sdkInstance.oauth.isAuthenticated().then((authenticated) => {
      if (!authenticated) return
      sdkInstance.oauth
        .getUser()
        .then((user) => setProfile(user))
        .catch(() => {
          // expired session — fall back to sign-in screen
        })
    })
  }, [])

  const handleSignIn = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const sdkInstance = getSDK()
      await sdkInstance.oauth.login({ scope: 'write', display: 'popup' })
      const user = await sdkInstance.oauth.getUser()
      setProfile(user)
    } catch (e) {
      setError(await formatApiError(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    await getSDK().oauth.logout()
    setProfile(null)
    setTracks(null)
    setOldHandle('')
  }, [])

  const handlePreview = useCallback(async () => {
    setError(null)
    setTracks(null)
    const handle = oldHandle.trim().replace(/^@/, '')
    if (!handle) {
      setError('Enter the old account handle.')
      return
    }
    setLoading(true)
    try {
      const sdkInstance = getSDK()
      const res = await sdkInstance.users.getTracksByUserHandle({
        handle,
        limit: 100
      })
      const data = res.data ?? []
      const previews: TrackPreview[] = data.map((t) => ({
        trackId: t.id,
        title: t.title,
        genre: t.genre ?? null,
        durationSec: t.duration ?? null,
        artworkUrl: t.artwork?._150x150 ?? t.artwork?._480x480 ?? null,
        isDownloadable: Boolean(t.isDownloadable),
        hasOriginal: Boolean(t.origFileCid) && t.isOriginalAvailable !== false
      }))
      if (previews.length === 0) {
        setError(`No tracks found for @${handle}.`)
      }
      setTracks(previews)
    } catch (e) {
      setError(await formatApiError(e))
    } finally {
      setLoading(false)
    }
  }, [oldHandle])

  const handleSubmit = useCallback(async () => {
    if (!profile || !tracks || tracks.length === 0) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newUserId: profile.id,
          newUserHandle: profile.handle,
          oldHandle: oldHandle.trim().replace(/^@/, ''),
          tracks
        })
      })
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${await res.text()}`)
      }
      const body = (await res.json()) as { id: string }
      navigate(`/status?id=${encodeURIComponent(body.id)}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }, [profile, tracks, oldHandle, navigate])

  if (!config.isConfigured) {
    return (
      <div className="card">
        <h2>Setup required</h2>
        <p>
          <code>VITE_AUDIUS_API_KEY</code> is not set. Create an Audius
          developer app at <a href="https://audius.co/settings">
          audius.co/settings → Developer Apps</a> and add the key to your
          environment.
        </p>
      </div>
    )
  }

  return (
    <>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>Step 1 — Sign in with your new account</h2>
        {profile ? (
          <div className="row">
            <div>
              Signed in as <strong>@{profile.handle}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                user_id: {profile.id}
              </div>
            </div>
            <button className="secondary" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        ) : (
          <button onClick={handleSignIn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in with Audius'}
          </button>
        )}
      </div>

      {profile && (
        <div className="card">
          <h2>Step 2 — Old account handle</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            The handle of the account whose tracks you want migrated.
          </p>
          <label htmlFor="old-handle">Old handle</label>
          <input
            id="old-handle"
            type="text"
            placeholder="oldartist"
            value={oldHandle}
            onChange={(e) => setOldHandle(e.target.value)}
            disabled={loading || submitting}
          />
          <div style={{ marginTop: 12 }}>
            <button
              onClick={handlePreview}
              disabled={loading || submitting || !oldHandle.trim()}
            >
              {loading ? 'Loading…' : 'Preview tracks'}
            </button>
          </div>
        </div>
      )}

      {tracks && tracks.length > 0 && (
        <div className="card">
          <h2>Step 3 — Review &amp; submit</h2>
          <div className="note">
            <strong>Heads up:</strong> the worker migrates the original
            uploaded master whenever it's still on the network, regardless
            of whether the track is marked downloadable. The few tracks
            tagged below as <em>mp3 only</em> have no original on file and
            will migrate with the transcoded MP3 stream.
          </div>
          <p className="muted" style={{ marginTop: 0 }}>
            {tracks.length} track{tracks.length === 1 ? '' : 's'} will be
            re-created on @{profile?.handle} once an Audius team member
            approves this request.
          </p>
          <ul className="track-list">
            {tracks.map((t) => (
              <li key={t.trackId}>
                {t.artworkUrl ? (
                  <img className="track-art" src={t.artworkUrl} alt="" />
                ) : (
                  <div className="track-art" />
                )}
                <div className="track-meta">
                  <div className="track-title">{t.title}</div>
                  <div className="track-sub">
                    {t.genre ?? 'Unknown genre'}
                    {' · '}
                    {t.hasOriginal ? 'original audio' : 'mp3 only'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 20 }}>
            <button
              onClick={handleSubmit}
              disabled={submitting || tracks.length === 0}
            >
              {submitting ? 'Submitting…' : 'Submit for approval'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
