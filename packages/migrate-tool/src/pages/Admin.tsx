import { useCallback, useEffect, useState } from 'react'

import type { MigrationRequest } from '../types'

const TOKEN_STORAGE_KEY = 'audius-migrate-admin-token'

export function Admin() {
  const [token, setToken] = useState<string>(
    () => sessionStorage.getItem(TOKEN_STORAGE_KEY) ?? ''
  )
  const [authenticated, setAuthenticated] = useState(false)
  const [requests, setRequests] = useState<MigrationRequest[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const fetchList = useCallback(
    async (bearerToken: string) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/admin/requests', {
          headers: { Authorization: `Bearer ${bearerToken}` }
        })
        if (res.status === 401) {
          throw new Error('Invalid admin token.')
        }
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`)
        }
        const body = (await res.json()) as { requests: MigrationRequest[] }
        setRequests(body.requests)
        setAuthenticated(true)
        sessionStorage.setItem(TOKEN_STORAGE_KEY, bearerToken)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load.')
        setAuthenticated(false)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (token) fetchList(token)
    // Run once on mount with the persisted token (if any). Subsequent
    // refreshes happen through the explicit "Refresh" button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUnlock = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      fetchList(token)
    },
    [token, fetchList]
  )

  const handleApprove = useCallback(
    async (id: string) => {
      if (!confirm('Approve this migration? The tracks will be re-uploaded on the new account.')) return
      setBusyId(id)
      try {
        const res = await fetch(
          `/api/admin/approve?id=${encodeURIComponent(id)}`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) throw new Error(`Approve failed: ${res.status}`)
        await fetchList(token)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Approve failed.')
      } finally {
        setBusyId(null)
      }
    },
    [token, fetchList]
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
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
          }
        )
        if (!res.ok) throw new Error(`Reject failed: ${res.status}`)
        await fetchList(token)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Reject failed.')
      } finally {
        setBusyId(null)
      }
    },
    [token, fetchList]
  )

  if (!authenticated) {
    return (
      <div className="card">
        <h2>Admin</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleUnlock}>
          <label htmlFor="admin-token">Admin bearer token</label>
          <input
            id="admin-token"
            type="password"
            placeholder="ADMIN_BEARER_TOKEN"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
          />
          <div style={{ marginTop: 12 }}>
            <button type="submit" disabled={!token || loading}>
              {loading ? 'Verifying…' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <>
      {error && <div className="error">{error}</div>}
      <div className="card">
        <div className="row">
          <h2 style={{ margin: 0 }}>Requests</h2>
          <button className="secondary" onClick={() => fetchList(token)}>
            Refresh
          </button>
        </div>
      </div>

      {(requests ?? []).length === 0 && (
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
                    {t.isDownloadable ? 'original audio' : 'transcoded mp3'}
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
