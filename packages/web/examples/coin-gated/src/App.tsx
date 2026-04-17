import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { config } from './config'
import { getSDK } from './sdk'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
// Phantom wallet detection
// ---------------------------------------------------------------------------

function getPhantom() {
  if (typeof window !== 'undefined' && 'solana' in window) {
    const provider = (window as Record<string, unknown>).solana as {
      isPhantom?: boolean
      disconnect(): Promise<void>
    }
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
// Hooks: useCoinBalance
// ---------------------------------------------------------------------------

function useCoinBalance(
  userId: string | undefined,
  walletAddress: string | undefined,
  coinMint: string | undefined
) {
  const sdk = getSDK()
  return useQuery({
    queryKey: ['coin-balance', userId ? 'user' : 'wallet', userId ?? walletAddress, coinMint],
    queryFn: async () => {
      if (userId) {
        const res = await sdk.users.getUserCoin({ id: userId, mint: coinMint! })
        const coin = res.data as { decimals?: number; balance?: number } | undefined
        if (!coin) return null
        const decimals = coin.decimals ?? 0
        const rawBalance = coin.balance ?? 0
        return rawBalance / Math.pow(10, decimals)
      }
      const res = await sdk.wallets.getWalletCoins({ walletId: walletAddress! })
      const match = (res.data ?? []).find(
        (c: { mint?: string }) => c.mint === coinMint
      ) as { decimals?: number; balance?: number } | undefined
      if (!match) return null
      const decimals = match.decimals ?? 0
      const rawBalance = match.balance ?? 0
      return rawBalance / Math.pow(10, decimals)
    },
    enabled: !!(userId || walletAddress) && !!coinMint
  })
}

// ---------------------------------------------------------------------------
// Hooks: useGatedTracks
// ---------------------------------------------------------------------------

function useGatedTracks(artistId: string | undefined, userId: string | undefined, walletConnected: boolean) {
  const sdk = getSDK()
  return useQuery({
    queryKey: ['gated-tracks', artistId, userId, walletConnected],
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
// App
// ---------------------------------------------------------------------------

export default function App() {
  // Coin browsing
  const [ticker, setTicker] = useState(config.defaultTicker)
  const [activeTicker, setActiveTicker] = useState(config.defaultTicker)

  // Auth state
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletPubkey, setWalletPubkey] = useState<string | null>(null)
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
  } = useGatedTracks(artistId, userId, walletConnected)

  const coinMint = coin?.mint
  const { data: coinBalance } = useCoinBalance(userId, walletPubkey ?? undefined, coinMint)

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
    if (!getPhantom()) {
      setError('Phantom wallet not found. Install phantom.app to use wallet sign-in.')
      return
    }
    try {
      const sdk = getSDK()
      const { publicKey } = await sdk.solanaWallet.auth(window.solana)
      setWalletConnected(true)
      setWalletPubkey(publicKey)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Wallet connection failed')
    }
  }, [])

  const handleDisconnectWallet = useCallback(async () => {
    const sdk = getSDK()
    const phantom = getPhantom()
    if (phantom) await phantom.disconnect().catch(() => {})
    sdk.solanaWallet.clearCredential()
    setWalletConnected(false)
    setWalletPubkey(null)
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
      if (playingId === trackId) {
        cleanupAudio()
        setPlayingId(null)
        return
      }

      cleanupAudio()
      setStreamLoading(true)
      setError(null)

      try {
        if (!profile?.id && !walletConnected) {
          setError('Sign in with Audius or connect a Solana wallet to stream.')
          setStreamLoading(false)
          return
        }

        const sdk = getSDK()
        const res = await sdk.tracks.streamTrack({
          trackId,
          userId,
          noRedirect: true
        })

        if (!audioRef.current) audioRef.current = new Audio()
        const audio = audioRef.current
        audio.src = res.data
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
    [playingId, profile, walletConnected, userId, cleanupAudio]
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
  const isAuthed = !!profile || walletConnected
  const coinTicker = coin?.ticker ?? activeTicker

  return (
    <div className='container'>
      {/* Header */}
      <h1 className='title'>Coin-Gated Tracks</h1>
      <p className='subtitle'>
        Browse and stream coin-gated tracks using an artist coin.
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

          {!walletConnected ? (
            <button
              className='button buttonSecondary'
              type='button'
              onClick={handleConnectWallet}
            >
              Connect Solana Wallet
            </button>
          ) : (
            <>
              <span title={walletPubkey ?? ''}>
                {walletPubkey?.slice(0, 4)}...{walletPubkey?.slice(-4)}
              </span>
              <button className='signOutBtn' type='button' onClick={handleDisconnectWallet}>
                Disconnect
              </button>
            </>
          )}

          {coinBalance != null && (
            <span className='balanceBadge'>
              {coinBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${coinTicker}
            </span>
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
          <p className='sectionTitle'>Coin-Gated Tracks</p>

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
              No coin-gated tracks found for ${coinTicker}.
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
                      disabled={!isAuthed || streamLoading}
                      onClick={() => handlePlay(id)}
                      aria-label={isPlaying ? 'Stop' : 'Play'}
                      title={!isAuthed ? 'Sign in or connect wallet to stream' : undefined}
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
