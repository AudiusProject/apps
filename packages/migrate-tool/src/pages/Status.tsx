import { useEffect, useState } from 'react'

import type { MigrationRequest } from '../types'

type Props = {
  requestId: string
  navigate: (path: string) => void
}

const POLL_INTERVAL_MS = 5000

export function Status({ requestId, navigate }: Props) {
  const [request, setRequest] = useState<MigrationRequest | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!requestId) return
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch(
          `/api/requests/${encodeURIComponent(requestId)}`
        )
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`)
        }
        const body = (await res.json()) as MigrationRequest
        if (!cancelled) {
          setRequest(body)
          setError(null)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load.')
        }
      }
    }

    load()
    const id = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [requestId])

  if (!requestId) {
    return (
      <div className="card">
        <h2>Missing request id</h2>
        <button className="secondary" onClick={() => navigate('/')}>
          Start a new migration
        </button>
      </div>
    )
  }

  if (error && !request) {
    return (
      <div className="card">
        <div className="error">{error}</div>
        <button className="secondary" onClick={() => navigate('/')}>
          Back to start
        </button>
      </div>
    )
  }

  if (!request) {
    return <div className="card">Loading…</div>
  }

  return (
    <>
      <div className="card">
        <div className="row">
          <div>
            <div className="muted" style={{ fontSize: 13 }}>
              Request id
            </div>
            <code>{request.id}</code>
          </div>
          <span className={`badge ${request.status}`}>{request.status}</span>
        </div>
        <p style={{ marginTop: 16, marginBottom: 0 }}>
          Migrating from <strong>@{request.oldHandle}</strong> to{' '}
          <strong>@{request.newUserHandle}</strong>
        </p>
      </div>

      {request.status === 'pending' && (
        <div className="card">
          <p style={{ margin: 0 }}>
            Waiting for an Audius team member to review. You can leave this
            page open — it polls every few seconds. The team will reach out
            via your usual support channel if they need to verify your
            identity before approving.
          </p>
        </div>
      )}

      {request.status === 'rejected' && (
        <div className="card">
          <p style={{ marginTop: 0 }}>
            <strong>Rejected.</strong>{' '}
            {request.rejectionReason ?? 'No reason given.'}
          </p>
          <button className="secondary" onClick={() => navigate('/')}>
            Start a new migration
          </button>
        </div>
      )}

      {request.status === 'failed' && (
        <div className="card">
          <p style={{ marginTop: 0 }}>
            <strong>Migration failed.</strong>{' '}
            {request.failureReason ?? 'See per-track results below.'}
          </p>
        </div>
      )}

      <div className="card">
        <h2>Tracks ({request.tracks.length})</h2>
        <ul className="track-list">
          {request.tracks.map((t) => {
            const result = request.results?.find(
              (r) => r.oldTrackId === t.trackId
            )
            return (
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
                    {result?.newTrackId && (
                      <>
                        {' · '}
                        new id: <code>{result.newTrackId}</code>
                      </>
                    )}
                    {result?.error && (
                      <>
                        {' · '}
                        <span style={{ color: '#c43c3c' }}>{result.error}</span>
                      </>
                    )}
                  </div>
                </div>
                {result && (
                  <span className={`badge ${result.status}`}>
                    {result.status}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
