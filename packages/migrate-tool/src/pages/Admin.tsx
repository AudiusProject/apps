import { useCallback, useEffect, useState } from 'react'

import {
  GoogleLogin,
  GoogleOAuthProvider,
  type CredentialResponse
} from '@react-oauth/google'

import { config } from '../config'
import type { MigrationRequest } from '../types'

const messages = {
  signInHint:
    'Sign in with your Audius Google account. Only @audius.co and @audius.org accounts can approve migrations.',
  signInError: 'Sign-in failed. Use an Audius Google account.'
}

function AdminConsole({ admin, onSignOut }: { admin: string; onSignOut: () => void }) {
  const [requests, setRequests] = useState<MigrationRequest[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/requests', {
        credentials: 'include'
      })
      if (res.status === 401) {
        onSignOut()
        throw new Error('Session expired. Please sign in again.')
      }
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`)
      }
      const body = (await res.json()) as { requests: MigrationRequest[] }
      setRequests(body.requests)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load.')
    } finally {
      setLoading(false)
    }
  }, [onSignOut])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleApprove = useCallback(
    async (id: string) => {
      if (
        !confirm(
          'Approve this migration? The tracks will be re-uploaded on the new account.'
        )
      )
        return
      setBusyId(id)
      try {
        const res = await fetch(
          `/api/admin/approve?id=${encodeURIComponent(id)}`,
          { method: 'POST', credentials: 'include' }
        )
        if (!res.ok) throw new Error(`Approve failed: ${res.status}`)
        await fetchList()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Approve failed.')
      } finally {
        setBusyId(null)
      }
    },
    [fetchList]
  )

  const handleReject = useCallback(
    async (id: string) => {
      const reason = prompt('Rejection reason (shown to the requester):')
      if (reason == null) return
      setBusyId(id)
      try {
        const res = await fetch(
          `/api/admin/reject?id=${encodeURIComponent(id)}`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
          }
        )
        if (!res.ok) throw new Error(`Reject failed: ${res.status}`)
        await fetchList()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Reject failed.')
      } finally {
        setBusyId(null)
      }
    },
    [fetchList]
  )

  return (
    <>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>Requests</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="muted" style={{ fontSize: 13 }}>
              {admin}
            </span>
            <button
              className="secondary"
              onClick={fetchList}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
            <button className="secondary" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {(requests ?? []).length === 0 && !loading && (
        <div className="card muted">No requests yet.</div>
      )}

      {(requests ?? []).map((req) => (
        <div key={req.id} className="card">
          <div className="row">
            <div>
              <div className="track-title">
                @{req.oldHandle} → @{req.newUserHandle}
              </div>
              <div className="track-sub">
                {req.tracks.length} track{req.tracks.length === 1 ? '' : 's'}
                {' · '}
                <code>{req.id}</code>
                {' · '}
                {new Date(req.createdAt).toLocaleString()}
              </div>
            </div>
            <span className={`badge ${req.status}`}>{req.status}</span>
          </div>

          <ul className="track-list">
            {req.tracks.slice(0, 5).map((t) => (
              <li key={t.trackId}>
                {t.artworkUrl ? (
                  <img className="track-art" src={t.artworkUrl} alt="" />
                ) : (
                  <div className="track-art" />
                )}
                <div className="track-meta">
                  <div className="track-title">{t.title}</div>
                  <div className="track-sub">
                    {t.genre ?? 'Unknown'}
                    {' · '}
                    {t.hasOriginal ? 'original audio' : 'mp3 only'}
                  </div>
                </div>
              </li>
            ))}
            {req.tracks.length > 5 && (
              <li className="muted">…and {req.tracks.length - 5} more</li>
            )}
          </ul>

          {req.status === 'pending' && (
            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button
                onClick={() => handleApprove(req.id)}
                disabled={busyId === req.id}
              >
                {busyId === req.id ? 'Working…' : 'Approve & execute'}
              </button>
              <button
                className="danger"
                onClick={() => handleReject(req.id)}
                disabled={busyId === req.id}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </>
  )
}

export function Admin() {
  const [admin, setAdmin] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Restore an existing session on mount.
  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/session', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { email: null }))
      .then((body: { email: string | null }) => {
        if (!cancelled && body.email) setAdmin(body.email)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleGoogleSuccess = useCallback(
    async (credential: CredentialResponse) => {
      setError(null)
      const token = credential.credential
      if (!token) {
        setError(messages.signInError)
        return
      }
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          setError(body.error ?? messages.signInError)
          return
        }
        const body = (await res.json()) as { email: string }
        setAdmin(body.email)
      } catch (e) {
        setError(e instanceof Error ? e.message : messages.signInError)
      }
    },
    []
  )

  const handleSignOut = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } finally {
      setAdmin(null)
    }
  }, [])

  if (admin) {
    return <AdminConsole admin={admin} onSignOut={handleSignOut} />
  }

  if (checking) {
    return <div className="card muted">Checking session…</div>
  }

  if (!config.googleClientId) {
    return (
      <div className="card">
        <h2>Admin</h2>
        <div className="error">
          Google OAuth is not configured (<code>VITE_GOOGLE_CLIENT_ID</code>{' '}
          missing).
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>Admin</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        {messages.signInHint}
      </p>
      {error && <div className="error">{error}</div>}
      <GoogleOAuthProvider clientId={config.googleClientId}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError(messages.signInError)}
          useOneTap={false}
        />
      </GoogleOAuthProvider>
    </div>
  )
}
