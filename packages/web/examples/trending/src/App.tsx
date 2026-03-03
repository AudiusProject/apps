import { useCallback, useRef, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTrendingTracks } from './hooks/useTrendingTracks'
import { getSDK } from './sdk'
import { TrackArtworkImage } from './components/TrackArtworkImage'
import type { ArtworkLike } from './utils/artwork'

const queryClient = new QueryClient()

type TrackItem = {
  id?: string
  track_id?: string
  title?: string
  user?: { name?: string }
  playCount?: number
  artwork?: ArtworkLike
  coverArt?: string
}

function TrendingScreen() {
  const { data: tracks, isPending, error } = useTrendingTracks()
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null) // single Audio instance for playback

  const trackIdForItem = useCallback((item: TrackItem) => {
    return item.id ?? String((item as { track_id?: string }).track_id ?? '')
  }, [])

  const handlePlay = useCallback(
    async (item: TrackItem) => {
      const trackId = trackIdForItem(item)
      if (!trackId) return

      if (playingId === trackId && audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current.src = ''
        setPlayingId(null)
        return
      }

      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }

      try {
        const sdk = getSDK()
        const streamUrl = await sdk.tracks.getTrackStreamUrl({ trackId })
        if (!audioRef.current) {
          audioRef.current = new Audio()
        }
        const audio = audioRef.current
        audio.src = streamUrl
        audio.onended = () => setPlayingId(null)
        audio.onerror = () => setPlayingId(null)
        await audio.play()
        setPlayingId(trackId)
      } catch {
        setPlayingId(null)
      }
    },
    [playingId, trackIdForItem]
  )

  if (isPending) {
    return (
      <div className="center">
        <div className="spinner" aria-hidden />
        <p className="loadingText">Loading trending tracks...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="center">
        <p className="errorText">
          Error: {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    )
  }

  const list = (tracks ?? []) as TrackItem[]

  return (
    <div className="container">
      <h1 className="title">Trending on Audius</h1>
      <p className="subtitle">SDK + Vite example</p>
      <ul className="list">
        {list.map((item) => {
          const id = trackIdForItem(item)
          const isPlaying = id ? playingId === id : false
          return (
            <li key={id || Math.random()} className="trackItem">
              <div className="trackItemContent">
                <TrackArtworkImage
                  key={id}
                  artwork={
                    item.artwork
                      ? { ...item.artwork, coverArt: item.coverArt ?? item.artwork.coverArt }
                      : item.coverArt
                        ? { coverArt: item.coverArt }
                        : undefined
                  }
                  size="150x150"
                  alt={item.title ?? 'Track'}
                  className="trackArtwork"
                />
                <div className="trackItemText">
                  <p className="trackTitle">{item.title}</p>
                  <p className="trackArtist">
                    {item.user?.name ?? 'Unknown Artist'}
                  </p>
                  <p className="trackPlays">
                    {item.playCount?.toLocaleString() ?? 0} plays
                  </p>
                </div>
                {id ? (
                  <button
                    type="button"
                    className={`playBtn ${isPlaying ? 'playBtnActive' : ''}`}
                    onClick={() => handlePlay(item)}
                    aria-label={isPlaying ? 'Stop' : 'Play'}
                  >
                    {isPlaying ? '⏹' : '▶'}
                  </button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TrendingScreen />
    </QueryClientProvider>
  )
}
