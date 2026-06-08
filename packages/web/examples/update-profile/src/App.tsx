import { useCallback, useEffect, useState } from 'react'
import { buildOAuthUrl, randomState } from './oauth/buildOAuthUrl'
import { getSDK } from './sdk'
import { config } from './config'

const OAUTH_CALLBACK_PATH = '/oauth/callback'

type Screen = 'home' | 'signed-in'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ handle: string } | null>(null)
  const [description, setDescription] = useState('')
  const [updateLoading, setUpdateLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

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
        const uid = data.userId ?? data.sub
        setProfile({ handle: data.handle ?? data.sub ?? 'Unknown' })
        setUserId(uid ?? null)
        setScreen('signed-in')
        try {
          const userRes = await getSDK().users.getUser({ id: uid! })
          const bio = userRes.data?.bio
          setDescription(bio ?? '')
        } catch {
          setDescription('')
        }
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

    // Popup flow: post token to opener and close
    if (window.opener) {
      window.opener.postMessage(
        { type: 'audius-oauth-callback', token: resolvedToken },
        window.location.origin
      )
      window.close()
      return
    }

    // Full-page fallback (e.g. direct navigation to callback)
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
      ...(config.apiKey ? { apiKey: config.apiKey } : { appName: 'UpdateProfileExample' })
    })
    const w = 500
    const h = 600
    const left = Math.round((window.screen.width - w) / 2)
    const top = Math.round((window.screen.height - h) / 2)
    const popup = window.open(oauthUrl, 'audius-oauth', `width=${w},height=${h},left=${left},top=${top}`)
    if (!popup) {
      // Popup blocked — fall back to redirect
      window.location.href = buildOAuthUrl({
        scope: 'write',
        redirectUri,
        state,
        responseMode: 'query',
        display: 'fullScreen',
        ...(config.apiKey ? { apiKey: config.apiKey } : { appName: 'UpdateProfileExample' })
      })
    }
  }, [])

  const handleSignOut = useCallback(() => {
    setUserId(null)
    setProfile(null)
    setDescription('')
    setResult(null)
    setTxHash(null)
    setScreen('home')
    setError(null)
  }, [])

  const handleUpdate = useCallback(async () => {
    if (!config.writeServerUrl || !userId) return
    setUpdateLoading(true)
    setResult(null)
    setTxHash(null)
    try {
      const res = await fetch(`${config.writeServerUrl}/update-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, description: description.trim() })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const hash = data?.transaction_hash ?? data?.transactionHash
        setTxHash(hash ?? null)
        setResult(hash ? 'Description updated.' : 'Description updated.')
      } else {
        setResult(data?.error ?? `Error ${res.status}`)
      }
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setUpdateLoading(false)
    }
  }, [userId, description])

  if (screen === 'signed-in' && userId && profile) {
    return (
      <div className="container">
        <div className="card">
          <div className="profileRow">
            <span className="handle">@{profile.handle}</span>
            <button type="button" className="signOutBtn" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
          <h1 className="title">Update description</h1>
          <p className="subtitle">Server uses your stored bearer to update your bio.</p>
          <textarea
            className="input"
            placeholder="New description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <button
            type="button"
            className="button"
            onClick={handleUpdate}
            disabled={updateLoading}
          >
            {updateLoading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} aria-hidden />
                Updating...
              </span>
            ) : (
              'Update description'
            )}
          </button>
          {result ? <p className="result">{result}</p> : null}
          {txHash ? (
            <div className="txLink">
              <a
                href={`https://explorer.audius.engineering/transaction/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View transaction
              </a>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  if (!config.isConfigured) {
    return (
      <div className="center">
        <div className="card">
          <h1 className="title">Update profile</h1>
          <p className="required">Requires your server. Create a .env with:</p>
          <p className="code">VITE_AUDIUS_API_KEY=your_api_key</p>
          <p className="code">VITE_WRITE_SERVER_URL=http://localhost:3001</p>
          <p className="required">Run the server with AUDIUS_API_KEY. See README.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="center">
      <div className="card">
        <h1 className="title">Update profile</h1>
        <p className="subtitle">
          Sign in with Audius (write scope) to authorize the app, then update your
          description.
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
            Sign in with Audius (write)
          </button>
        )}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </div>
  )
}
