import { MouseEvent, useCallback, useRef } from 'react'

import { useCurrentUserId, useTrack } from '@audius/common/api'
import { SquareSizes } from '@audius/common/models'
import { playerSelectors } from '@audius/common/store'
import {
  IconImage,
  IconWaveForm as IconVisualizer,
  useTheme,
  Box,
  Paper,
  Text
} from '@audius/harmony'
import { animated, useSpring } from '@react-spring/web'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router'

import { Draggable } from 'components/dragndrop'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import { TrackDogEar } from 'components/track/TrackDogEar'
import {
  useTrackCoverArt,
  useTrackCoverArtDominantColor
} from 'hooks/useTrackCoverArt'
import { NO_VISUALIZER_ROUTES } from 'pages/visualizer/constants'
import { openVisualizer } from 'pages/visualizer/store/slice'
import { fullTrackPage } from 'utils/route'

import styles from './NowPlayingArtworkTile.module.css'

const { getTrackId } = playerSelectors

const messages = {
  viewTrack: 'View currently playing track',
  visualizer: 'Visualizer',
  openVisualizer: 'Open visualizer'
}

const AnimatedPaper = animated(Paper)

type NowPlayingArtworkTileProps = {
  size?: number
}

const isSmall = (size: number) => size < 100

export const NowPlayingArtworkTile = ({
  size = 208
}: NowPlayingArtworkTileProps) => {
  const dispatch = useDispatch()
  const location = useLocation()
  const { pathname } = location
  const { motion } = useTheme()

  const { data: currentUserId } = useCurrentUserId()
  const trackId = useSelector(getTrackId)
  const { data: partialTrack } = useTrack(trackId, {
    select: (track) => {
      return {
        title: track?.title,
        isStreamGated: !!track?.is_stream_gated,
        permalink: track?.permalink,
        isOwner: Boolean(
          track?.owner_id && currentUserId && track.owner_id === currentUserId
        )
      }
    }
  })
  const { title, isStreamGated, permalink, isOwner } = partialTrack ?? {}

  const { imageUrl: trackCoverArtImage, hasNoArtwork } = useTrackCoverArt({
    trackId: trackId ?? undefined,
    size: SquareSizes.SIZE_480_BY_480
  })

  const handleShowVisualizer = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation()
      if (NO_VISUALIZER_ROUTES.has(pathname)) return
      event.preventDefault()
      dispatch(openVisualizer())
    },
    [pathname, dispatch]
  )

  const coverArtColor = useTrackCoverArtDominantColor({
    trackId: trackId ?? undefined
  })

  const isTrackVisible = !!(permalink && trackId)
  const prevIsTrackVisible = useRef(isTrackVisible)
  const trackVisibilityChanged = prevIsTrackVisible.current !== isTrackVisible
  prevIsTrackVisible.current = isTrackVisible

  // `from` seeds the spring on mount. If the track is already playing when this
  // component mounts (e.g. sidebar toggled), start at the visible state so there
  // is no flash. `from` is ignored on subsequent renders — the spring continues
  // from its current animated value.
  const slideInProps = useSpring({
    from: {
      opacity: isTrackVisible ? 1 : 0,
      height: isTrackVisible ? size : 0
    },
    to: {
      opacity: isTrackVisible ? 1 : 0,
      height: isTrackVisible ? size : 0
    },
    immediate: !trackVisibilityChanged
  })

  if (!permalink || !trackId) return null

  const renderCoverArt = () => {
    return (
      <AnimatedPaper
        border='default'
        borderRadius={isSmall(size) ? 's' : 'm'}
        css={{
          display: 'block',
          transition: `opacity ${motion.quick}, box-shadow ${motion.quick}`,
          boxShadow: `0 1px 20px -3px rgba(
            ${coverArtColor?.r},
            ${coverArtColor?.g},
            ${coverArtColor?.b},
            ${coverArtColor ? 0.25 : 0})`
        }}
        style={slideInProps}
      >
        <Link
          className={styles.coverArtLink}
          to={permalink}
          aria-label={messages.viewTrack}
        >
          <DynamicImage
            key={trackId}
            useSkeleton={!hasNoArtwork}
            image={trackCoverArtImage}
          >
            <div className={styles.artworkOverlay}>
              {hasNoArtwork ? (
                <Box
                  css={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                    '& svg path': { fill: 'var(--harmony-static-white)' }
                  }}
                >
                  <IconImage width={48} height={48} />
                </Box>
              ) : null}
              {!isSmall(size) && !NO_VISUALIZER_ROUTES.has(pathname) ? (
                <button
                  type='button'
                  className={styles.visualizerPill}
                  aria-label={messages.openVisualizer}
                  onClick={handleShowVisualizer}
                >
                  <IconVisualizer className={styles.visualizerPillIcon} />
                  <Text
                    tag='span'
                    variant='body'
                    size='xs'
                    strength='strong'
                    className={styles.visualizerPillLabel}
                  >
                    {messages.visualizer}
                  </Text>
                </button>
              ) : null}
            </div>
          </DynamicImage>
        </Link>
      </AnimatedPaper>
    )
  }

  const content = (
    <Box mh='auto' mb={0} css={{ position: 'relative' }} h={size} w={size}>
      {isSmall(size) ? (
        <Box
          css={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: 'scale(0.5)',
            transformOrigin: 'top left',
            zIndex: 11
          }}
        >
          <TrackDogEar trackId={trackId} />
        </Box>
      ) : (
        <TrackDogEar trackId={trackId} />
      )}
      {renderCoverArt()}
    </Box>
  )

  return isStreamGated ? (
    content
  ) : (
    <Draggable
      text={title}
      kind='track'
      id={trackId}
      isOwner={isOwner}
      link={fullTrackPage(permalink)}
      asChild
    >
      {content}
    </Draggable>
  )
}
