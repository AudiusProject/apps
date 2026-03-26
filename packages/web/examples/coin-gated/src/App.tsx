import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import bs58 from 'bs58'

import { config } from './config'
import { getSDK } from './sdk'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SolanaWalletAuth = {
  pubkey: string
  message: string
  signature: string // base58-encoded ed25519 signature
}

type UserProfile = {
  id?: string
  handle?: string
  name?: string
}

type TrackItem = {
  id?: string
  title?: string
  user?: { name?: string }
  artwork?: { _480x480?: string; _150x150?: string }
  access?: { stream?: boolean; download?: boolean }
  streamConditions?: {
    tokenGate?: { tokenMint?: string; tokenAmount?: number }
  } | null
  isStreamGated?: boolean
}

// ---------------------------------------------------------------------------
// Phantom / Solana wallet adapter
// ---------------------------------------------------------------------------

interface PhantomProvider {
  isPhantom?: boolean
  connect(): Promise<{ publicKey: { toBytes(): Uint8Array; toString(): string } }>
  signMessage(message: Uint8Array, encoding: string): Promise<{ signature: Uint8Array }>
  disconnect(): Promise<void>
}

function getPhantom(): PhantomProvider | null {
  if (typeof window !== 'undefined' && 'solana' in window) {
    const provider = (window as Record<string, unknown>).solana as PhantomProvider
    if (provider?.isPhantom) return provider
  }
  return null
}

// ---------------------------------------------------------------------------
// Hooks: useCoin
// ---------------------------------------------------------------------------

function useCoin(ticker: string) {
  const sdk = getSDK()
  return useQuery({
    queryKey: ['coin', ticker],
    queryFn: async () => {
      const res = await sdk.coins.getCoinByTicker({ ticker })
      return res.data
    },
    enabled: ticker.length > 0
  })
}

// ---------------------------------------------------------------------------
// Hooks: useGatedTracks
// ---------------------------------------------------------------------------

function useGatedTracks(artistId: string | undefined, userId: string | undefined) {
  const sdk = getSDK()
  return useQuery({
    queryKey: ['gated-tracks', artistId, userId],
    queryFn: async () => {
      const res = await sdk.users.getTracksByUser({
        id: artistId!,
        userId,
        gateCondition: ['token'] as never
      })
      return (res.data ?? []) as TrackItem[]
    },
    enabled: !!artistId
  })
}

// ---------------------------------------------------------------------------
// Stream helpers
// ---------------------------------------------------------------------------

async function streamWithOAuth(trackId: string, userId: string): Promise<string> {
  // Use the generated streamTrack method which goes through the SDK middleware
  // pipeline (adds Bearer token automatically). With noRedirect, the API
  // returns a JSON object { data: "https://content-node/..." } instead of 302.
  const sdk = getSDK()
  const res = await sdk.tracks.streamTrack({ trackId, userId, noRedirect: true })
  // res.data is the direct content node URL — use it as the audio src
  return res.data
}

async function streamWithWallet(
  trackId: string,
  wallet: SolanaWalletAuth
): Promise<string> {
  // Build the stream URL manually and add Solana wallet headers.
  // The middleware on the API verifies the ed25519 signature and checks
  // on-chain token balances in real time.
  const sdk = getSDK()
  // Get the base URL from the SDK's configuration
  const base = (sdk.tracks as unknown as { configuration: { basePath: string } })
    .configuration.basePath
  const url = `${base}/tracks/${encodeURIComponent(trackId)}/stream?no_redirect=true`
  const res = await fetch(url, {
    headers: {
      'X-Solana-Wallet': wallet.pubkey,
      'X-Solana-Message': wallet.message,
      'X-Solana-Signature': wallet.signature
    }
  })
  if (!res.ok) throw new Error(`Stream failed: ${res.status}`)
  const json = await res.json()
  return json.data
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  // Coin browsing
  const [ticker, setTicker] = useState(config.defaultTicker)
  const [activeTicker, setActiveTicker] = useState(config.defaultTicker)

  // Auth state
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [solWallet, setSolWallet] = useState<SolanaWalletAuth | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Playback
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [streamLoading, setStreamLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Data
  const { data: coin, isPending: coinPending, error: coinError } = useCoin(activeTicker)
  const userId = profile?.id ? String(profile.id) : undefined
  const artistId = coin?.ownerId ? String(coin.ownerId) : undefined
  const {
    data: tracks,
    isPending: tracksPending,
    error: tracksError
  } = useGatedTracks(artistId, userId)

  // -------------------------------------------------------------------------
  // OAuth session restore
  // -------------------------------------------------------------------------
  useEffect(() => {
    const sdk = getSDK()
    if (sdk.oauth.hasRedirectResult()) {
      setLoading(true)
      sdk.oauth
        .handleRedirect()
        .then(() => sdk.oauth.getUser())
        .then((user) => {
          setProfile(user)
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : 'Sign-in failed')
        })
        .finally(() => setLoading(false))
      return
    }
    sdk.oauth.isAuthenticated().then((authenticated) => {
      if (!authenticated) return
      setLoading(true)
      sdk.oauth
        .getUser()
        .then((user) => setProfile(user))
        .catch(() => {})
        .finally(() => setLoading(false))
    })
  }, [])

  // -------------------------------------------------------------------------
  // Auth handlers
  // -------------------------------------------------------------------------
  const handleAudiusSignIn = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const sdk = getSDK()
      await sdk.oauth.login({ scope: 'read', display: 'popup' })
      const p = await sdk.oauth.getUser()
      setProfile(p)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleAudiusSignOut = useCallback(async () => {
    const sdk = getSDK()
    await sdk.oauth.logout().catch(() => {})
    setProfile(null)
    setError(null)
  }, [])

  const handleConnectWallet = useCallback(async () => {
    setError(null)
    const phantom = getPhantom()
    if (!phantom) {
      setError('Phantom wallet not found. Install phantom.app to use wallet sign-in.')
      return
    }
    try {
      const { publicKey } = await phantom.connect()
      const pubkey = publicKey.toString()
      const message = `Audius coin-gated access: ${Date.now()}`
      const msgBytes = new TextEncoder().encode(message)
      const { signature: sigBytes } = await phantom.signMessage(msgBytes, 'utf8')
      const signature = bs58.encode(sigBytes)
      setSolWallet({ pubkey, message, signature })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Wallet connection failed')
    }
  }, [])

  const handleDisconnectWallet = useCallback(async () => {
    const phantom = getPhantom()
    if (phantom) await phantom.disconnect().catch(() => {})
    setSolWallet(null)
  }, [])

  // -------------------------------------------------------------------------
  // Playback
  // -------------------------------------------------------------------------
  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
  }, [])

  const handlePlay = useCallback(
    async (trackId: string) => {
      // Toggle off
      if (playingId === trackId) {
        cleanupAudio()
        setPlayingId(null)
        return
      }

      cleanupAudio()
      setStreamLoading(true)
      setError(null)

      try {
        let streamUrl: string
        if (profile?.id) {
          streamUrl = await streamWithOAuth(trackId, String(profile.id))
        } else if (solWallet) {
          streamUrl = await streamWithWallet(trackId, solWallet)
        } else {
          setError('Sign in with Audius or connect a Solana wallet to stream.')
          setStreamLoading(false)
          return
        }

        if (!audioRef.current) audioRef.current = new Audio()
        const audio = audioRef.current
        audio.src = streamUrl
        audio.onended = () => {
          setPlayingId(null)
          cleanupAudio()
        }
        audio.onerror = () => {
          setPlayingId(null)
          cleanupAudio()
        }
        await audio.play()
        setPlayingId(trackId)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Stream failed')
        setPlayingId(null)
      } finally {
        setStreamLoading(false)
      }
    },
    [playingId, profile, solWallet, cleanupAudio]
  )

  // -------------------------------------------------------------------------
  // Render: not configured
  // -------------------------------------------------------------------------
  if (!config.isConfigured) {
    return (
      <div className='center'>
        <div className='card'>
          <h1 className='title'>Coin-Gated Tracks</h1>
          <p className='required'>Requires an Audius developer app API key.</p>
          <p className='required'>
            Create a <code>.env</code> file with:
          </p>
          <p className='code'>VITE_AUDIUS_API_KEY=your_api_key</p>
          <p className='required'>
            Get an API key at{' '}
            <strong>audius.co/settings &rarr; Developer Apps</strong>.
          </p>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render: main
  // -------------------------------------------------------------------------
  const isAuthed = !!profile || !!solWallet
  const coinTicker = coin?.ticker ?? activeTicker

  return (
    <div className='container'>
      {/* Header */}
      <h1 className='title'>Coin-Gated Tracks</h1>
      <p className='subtitle'>
        Browse and stream token-gated tracks using an artist coin.
        Sign in with Audius or connect a Solana wallet.
      </p>

      {/* Ticker input */}
      <div className='tickerRow'>
        <input
          className='tickerInput'
          type='text'
          placeholder='Coin ticker (e.g. YAK)'
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setActiveTicker(ticker)
          }}
        />
        <button
          className='button'
          type='button'
          onClick={() => setActiveTicker(ticker)}
          disabled={!ticker}
        >
          Browse
        </button>
      </div>

      {/* Coin info */}
      {coinPending ? (
        <div className='card'>
          <div className='spinner' />
        </div>
      ) : coinError ? (
        <div className='card'>
          <p className='error'>
            Could not load coin "${activeTicker}":{' '}
            {coinError instanceof Error ? coinError.message : 'Unknown error'}
          </p>
        </div>
      ) : coin ? (
        <div className='coinCard'>
          {coin.logoUri ? (
            <img className='coinLogo' src={coin.logoUri} alt={coin.ticker ?? ''} />
          ) : (
            <div className='coinLogo' />
          )}
          <div className='coinInfo'>
            <p className='coinName'>${coinTicker}</p>
            <p className='coinMeta'>
              {coin.name}
              {coin.price != null ? ` \u00B7 $${Number(coin.price).toFixed(4)}` : ''}
            </p>
          </div>
        </div>
      ) : null}

      {/* Auth section */}
      <div className='card'>
        <div className='authSection'>
          {!profile ? (
            <button
              className='button'
              type='button'
              onClick={handleAudiusSignIn}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in with Audius'}
            </button>
          ) : (
            <>
              <span>@{profile.handle ?? 'user'}</span>
              <button className='signOutBtn' type='button' onClick={handleAudiusSignOut}>
                Sign out
              </button>
            </>
          )}

          {!solWallet ? (
            <button
              className='button buttonSecondary'
              type='button'
              onClick={handleConnectWallet}
            >
              Connect Solana Wallet
            </button>
          ) : (
            <>
              <span title={solWallet.pubkey}>
                {solWallet.pubkey.slice(0, 4)}...{solWallet.pubkey.slice(-4)}
              </span>
              <button className='signOutBtn' type='button' onClick={handleDisconnectWallet}>
                Disconnect
              </button>
            </>
          )}
        </div>
        {!isAuthed && (
          <p className='authStatus'>
            Sign in to check access and stream gated tracks.
          </p>
        )}
      </div>

      {/* Now playing */}
      {playingId && (
        <div className='nowPlaying'>
          <div className='spinner' />
          <span>
            Playing: {tracks?.find((t) => t.id === playingId)?.title ?? playingId}
          </span>
        </div>
      )}

      {/* Track list */}
      {coin && (
        <div className='card'>
          <p className='sectionTitle'>Token-Gated Tracks</p>

          {tracksPending ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
              <div className='spinner' />
            </div>
          ) : tracksError ? (
            <p className='error'>
              {tracksError instanceof Error ? tracksError.message : 'Failed to load tracks'}
            </p>
          ) : !tracks || tracks.length === 0 ? (
            <p className='emptyState'>
              No token-gated tracks found for ${coinTicker}.
            </p>
          ) : (
            <ul className='trackList'>
              {tracks.map((track) => {
                const id = track.id ?? ''
                const hasAccess = track.access?.stream === true
                const isPlaying = id === playingId
                const gate = track.streamConditions?.tokenGate
                const requiredAmount = gate?.tokenAmount ?? 0

                return (
                  <li key={id} className='trackItem'>
                    <span className='lockIcon'>{hasAccess ? '\uD83D\uDD13' : '\uD83D\uDD12'}</span>
                    <div className='trackInfo'>
                      <p className='trackTitle'>{track.title}</p>
                      <p className='trackGate'>
                        Requires {requiredAmount} ${coinTicker}
                        {' \u00B7 '}
                        <span className={hasAccess ? 'accessGranted' : 'accessDenied'}>
                          {hasAccess ? 'Access granted' : 'Locked'}
                        </span>
                      </p>
                    </div>
                    <button
                      type='button'
                      className={`playBtn ${isPlaying ? 'playBtnActive' : ''}`}
                      disabled={(!hasAccess && !solWallet) || streamLoading}
                      onClick={() => handlePlay(id)}
                      aria-label={isPlaying ? 'Stop' : 'Play'}
                      title={
                        !hasAccess && !solWallet
                          ? 'Sign in or connect wallet to stream'
                          : undefined
                      }
                    >
                      {isPlaying ? '\u23F9' : '\u25B6'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Error */}
      {error && <p className='error'>{error}</p>}
    </div>
  )
}
