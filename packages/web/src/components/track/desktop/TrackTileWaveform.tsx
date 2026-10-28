import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react'

import {
  useTimestampedComments,
  useUser,
  type TimestampedComment
} from '@audius/common/api'
import { ID } from '@audius/common/models'
import {
  CommonState,
  playbackActions,
  playbackSelectors
} from '@audius/common/store'
import { Box, Tooltip, useTheme } from '@audius/harmony'
import { Id } from '@audius/sdk'
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

const HEIGHT = 56
const BAR_WIDTH = 2
const BAR_GAP = 1
const MIN_BAR_HEIGHT = 2
const AVATAR_SIZE = 24
const MAX_AVATARS = 24
const POLL_MS = 250
// Matches the comments context: play first, seek once the engine has loaded.
const SEEK_AFTER_PLAY_MS = 100

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

// Small deterministic PRNG so a track always draws the same shape.
const mulberry32 = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/**
 * No node serves audio peaks yet, so the shape is synthesized from the track
 * id: a slow section envelope with per-bar jitter, which reads as a song
 * without pretending to be one. Swap this for real peaks when they exist.
 */
const makePeaks = (seed: number, count: number) => {
  const rand = mulberry32(seed)
  const peaks: number[] = []
  let envelope = 0.3
  for (let i = 0; i < count; i++) {
    if (rand() < 0.03) envelope = 0.2 + rand() * 0.75
    const jitter = 0.55 + rand() * 0.45
    const noise = (rand() - 0.5) * 0.12
    peaks.push(clamp(envelope * jitter + noise, 0.05, 1))
  }
  return peaks
}

const buildPath = (peaks: number[]) => {
  let d = ''
  for (let i = 0; i < peaks.length; i++) {
    const h = Math.max(MIN_BAR_HEIGHT, Math.round(peaks[i] * HEIGHT))
    const x = i * (BAR_WIDTH + BAR_GAP)
    d += `M${x} ${HEIGHT - h}h${BAR_WIDTH}v${h}h-${BAR_WIDTH}z`
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
}

const CommentAvatar = ({ comment, x, permalink }: CommentAvatarProps) => {
  const dispatch = useDispatch()
  const { data: name } = useUser(comment.userId, {
    select: (user) => user.name
  })

  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      // The desktop track page highlights and scrolls to this comment.
      dispatch(push(`${permalink}?commentId=${Id.parse(comment.id)}`))
    },
    [dispatch, permalink, comment.id]
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
    onPlay
  } = props
  const dispatch = useDispatch()
  const { color } = useTheme()
  const [measureRef, { width }] = useMeasure<HTMLDivElement>()
  const { ref: inViewRef, inView } = useDeferredElement()
  const progress = useTrackProgress(isActive, isPlaying, duration)

  // One comments request per tile, and only for tiles that have comments and
  // have scrolled near the viewport.
  const comments = useTimestampedComments(trackId, inView && commentCount > 0)

  const barCount = Math.max(0, Math.floor(width / (BAR_WIDTH + BAR_GAP)))
  const path = useMemo(
    () => (barCount ? buildPath(makePeaks(trackId, barCount)) : ''),
    [trackId, barCount]
  )

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
        onPlay()
        window.setTimeout(
          () => dispatch(seekTo({ seconds })),
          SEEK_AFTER_PLAY_MS
        )
      }
    },
    [canSeek, duration, isActive, onPlay, dispatch]
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
        height: HEIGHT,
        cursor: 'pointer',
        userSelect: 'none'
      }}
    >
      {path ? (
        <>
          <svg
            width={width}
            height={HEIGHT}
            css={{ position: 'absolute', inset: 0, display: 'block' }}
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
            <svg width={width} height={HEIGHT} css={{ display: 'block' }}>
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
        />
      ))}
    </Box>
  )
}
