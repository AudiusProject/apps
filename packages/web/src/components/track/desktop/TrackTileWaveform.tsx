import {
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import {
  useTimestampedComments,
  useTrackWaveformPeaks,
  useUser,
  type TimestampedComment
} from '@audius/common/api'
import { ID } from '@audius/common/models'
import {
  CommonState,
  playbackActions,
  playbackSelectors
} from '@audius/common/store'
import { makeWaveformPeaks, resampleWaveformPeaks } from '@audius/common/utils'
import { Box, Tooltip, useTheme } from '@audius/harmony'
import { Id } from '@audius/sdk'
import { keyframes } from '@emotion/react'
import { useDispatch, useSelector } from 'react-redux'
import { useMeasure } from 'react-use'

import { Avatar } from 'components/avatar'
import { useDeferredElement } from 'pages/search-explore-page/components/desktop/useDeferredElement'
import { audioPlayer } from 'services/audio-player'
import { push } from 'utils/navigation'

const { seekTo } = playbackActions
const { getSeek, getSeekCounter } = playbackSelectors

const messages = {
  seek: (title: string) => `Seek within ${title}`,
  openComment: (name: string) => `Open comment by ${name}`
}

const DEFAULT_HEIGHT = 56
const BAR_WIDTH = 2
const BAR_GAP = 1
const MIN_BAR_HEIGHT = 2
const AVATAR_SIZE = 24
const MAX_AVATARS = 24
const POLL_MS = 250
// A seek requested before playback starts waits this long for the load.
const PENDING_SEEK_TTL_MS = 15000
const PENDING_SEEK_POLL_MS = 50

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const buildPath = (peaks: number[], height: number) => {
  let d = ''
  for (let i = 0; i < peaks.length; i++) {
    const h = Math.max(MIN_BAR_HEIGHT, Math.round(peaks[i] * height))
    const x = i * (BAR_WIDTH + BAR_GAP)
    d += `M${x} ${height - h}h${BAR_WIDTH}v${h}h-${BAR_WIDTH}z`
  }
  return d
}

/** Fraction of the track that has played, polled only while this tile is the active track. */
const useTrackProgress = (
  isActive: boolean,
  isPlaying: boolean,
  duration: number
) => {
  const [position, setPosition] = useState(0)
  const seek = useSelector((state: CommonState) => getSeek(state))
  const seekCounter = useSelector((state: CommonState) => getSeekCounter(state))

  useEffect(() => {
    if (!isActive) setPosition(0)
  }, [isActive])

  useEffect(() => {
    if (isActive && seek !== null) setPosition(seek)
  }, [isActive, seek, seekCounter])

  useEffect(() => {
    if (!isActive) return
    const tick = () => {
      const next = audioPlayer?.getPosition() ?? 0
      setPosition((current) =>
        Math.abs(current - next) < 0.05 ? current : next
      )
    }
    tick()
    if (!isPlaying) return
    const interval = window.setInterval(tick, POLL_MS)
    return () => window.clearInterval(interval)
  }, [isActive, isPlaying])

  return duration > 0 ? clamp(position / duration, 0, 1) : 0
}

type CommentAvatarProps = {
  comment: TimestampedComment
  x: number
  permalink: string
  onOpenComment?: (commentId: ID) => void
}

const CommentAvatar = ({
  comment,
  x,
  permalink,
  onOpenComment
}: CommentAvatarProps) => {
  const dispatch = useDispatch()
  const { data: name } = useUser(comment.userId, {
    select: (user) => user.name
  })

  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      if (onOpenComment) {
        onOpenComment(comment.id)
        return
      }
      // The desktop track page highlights and scrolls to this comment.
      dispatch(push(`${permalink}?commentId=${Id.parse(comment.id)}`))
    },
    [dispatch, permalink, comment.id, onOpenComment]
  )

  if (!name) return null

  return (
    <Tooltip
      placement='top'
      mouseEnterDelay={0.1}
      shouldWrapContent
      text={
        <>
          <strong>{name}</strong> {comment.message}
        </>
      }
    >
      <Box
        role='button'
        aria-label={messages.openComment(name)}
        onClick={handleClick}
        css={{
          position: 'absolute',
          bottom: 0,
          left: x,
          zIndex: 1,
          cursor: 'pointer',
          borderRadius: '50%',
          transform: 'translateX(-50%)',
          transition: 'transform 120ms ease-out',
          '&:hover': { transform: 'translateX(-50%) scale(1.15)', zIndex: 2 }
        }}
      >
        <Avatar userId={comment.userId} size='small' aria-hidden />
      </Box>
    </Tooltip>
  )
}

type TrackTileWaveformProps = {
  trackId: ID
  title: string
  permalink: string
  duration: number
  commentCount: number
  isActive: boolean
  isPlaying: boolean
  /** Seeking is only meaningful on the full stream, not a gated preview. */
  canSeek: boolean
  /** Start this tile playing; the tile owns gating and queue semantics. */
  onPlay: () => void
  /** Replaces the default of opening the comment on the track page. */
  onOpenComment?: (commentId: ID) => void
  height?: number
}

/**
 * Bar waveform for a desktop track tile. Click seeks (or starts the track at
 * that point), and comments with a track timestamp sit on the baseline as
 * avatars that open the comment on the track page.
 */
export const TrackTileWaveform = (props: TrackTileWaveformProps) => {
  const {
    trackId,
    title,
    permalink,
    duration,
    commentCount,
    isActive,
    isPlaying,
    canSeek,
    onPlay,
    onOpenComment,
    height = DEFAULT_HEIGHT
  } = props
  const dispatch = useDispatch()
  const { color } = useTheme()
  const [measureRef, { width }] = useMeasure<HTMLDivElement>()
  const { ref: inViewRef, inView } = useDeferredElement()
  const progress = useTrackProgress(isActive, isPlaying, duration)

  // The player swaps in a new audio element once the stream URL resolves, and
  // marks this track active before that, so a seek sent early lands on the old
  // element. Hold it until this track is active on a new element.
  const isActiveRef = useRef(isActive)
  isActiveRef.current = isActive
  const pendingSeekRef = useRef<number | null>(null)
  const clearPendingSeek = useCallback(() => {
    if (pendingSeekRef.current !== null) {
      window.clearInterval(pendingSeekRef.current)
      pendingSeekRef.current = null
    }
  }, [])
  useEffect(() => clearPendingSeek, [clearPendingSeek])

  const seekAfterLoad = useCallback(
    (seconds: number) => {
      clearPendingSeek()
      const staleAudio = audioPlayer?.audio
      const startedAt = Date.now()
      pendingSeekRef.current = window.setInterval(() => {
        if (Date.now() - startedAt > PENDING_SEEK_TTL_MS) {
          clearPendingSeek()
          return
        }
        if (!isActiveRef.current || audioPlayer?.audio === staleAudio) return
        clearPendingSeek()
        dispatch(seekTo({ seconds }))
      }, PENDING_SEEK_POLL_MS)
    },
    [clearPendingSeek, dispatch]
  )

  // One comments request per tile, and only for tiles that have comments and
  // have scrolled near the viewport.
  const comments = useTimestampedComments(trackId, inView && commentCount > 0)
  // Settles to null on a miss or error; either way the fallback shape draws.
  const { data: realPeaks, isFetched: isPeaksSettled } = useTrackWaveformPeaks(
    trackId,
    inView
  )

  const barCount = Math.max(0, Math.floor(width / (BAR_WIDTH + BAR_GAP)))
  // Wait for the lookup so a real shape never replaces a fake one on screen.
  const path = useMemo(() => {
    if (!barCount || !isPeaksSettled) return ''
    return buildPath(
      realPeaks
        ? resampleWaveformPeaks(realPeaks, barCount)
        : makeWaveformPeaks(trackId, barCount),
      height
    )
  }, [trackId, barCount, realPeaks, isPeaksSettled, height])

  const avatars = useMemo(() => {
    if (!width || !duration) return []
    const placed: { comment: TimestampedComment; x: number }[] = []
    let lastX = -Infinity
    for (const comment of comments) {
      const x = clamp(
        (comment.trackTimestampS / duration) * width,
        AVATAR_SIZE / 2,
        width - AVATAR_SIZE / 2
      )
      // Keep neighbours from stacking; the first comment at a spot wins.
      if (x - lastX < AVATAR_SIZE + 2) continue
      placed.push({ comment, x })
      lastX = x
      if (placed.length >= MAX_AVATARS) break
    }
    return placed
  }, [comments, duration, width])

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) measureRef(node)
      inViewRef(node)
    },
    [measureRef, inViewRef]
  )

  const handleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.stopPropagation()
      if (!canSeek) {
        onPlay()
        return
      }
      const rect = e.currentTarget.getBoundingClientRect()
      const fraction = clamp((e.clientX - rect.left) / rect.width, 0, 1)
      const seconds = fraction * duration
      if (isActive) {
        dispatch(seekTo({ seconds }))
      } else {
        seekAfterLoad(seconds)
        onPlay()
      }
    },
    [canSeek, duration, isActive, onPlay, dispatch, seekAfterLoad]
  )

  return (
    <Box
      ref={setRefs}
      role='slider'
      aria-label={messages.seek(title)}
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={Math.round(progress * duration)}
      onClick={handleClick}
      css={{
        position: 'relative',
        width: '100%',
        height,
        cursor: 'pointer',
        userSelect: 'none'
      }}
    >
      {path ? (
        <>
          <svg
            width={width}
            height={height}
            css={{
              position: 'absolute',
              inset: 0,
              display: 'block',
              animation: `${fadeIn} 200ms ease-out`
            }}
            aria-hidden
          >
            <path d={path} fill={color.neutral.n150} />
          </svg>
          <Box
            css={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: `${progress * 100}%`,
              overflow: 'hidden',
              transition: isPlaying ? `width ${POLL_MS}ms linear` : undefined
            }}
            aria-hidden
          >
            <svg width={width} height={height} css={{ display: 'block' }}>
              <path d={path} fill={color.primary.p300} />
            </svg>
          </Box>
        </>
      ) : null}
      {avatars.map(({ comment, x }) => (
        <CommentAvatar
          key={comment.id}
          comment={comment}
          x={x}
          permalink={permalink}
          onOpenComment={onOpenComment}
        />
      ))}
    </Box>
  )
}
