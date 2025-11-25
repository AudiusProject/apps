import { MouseEvent, useCallback } from 'react'

import { useCurrentUserId, useTrack } from '@audius/common/api'
import { SquareSizes } from '@audius/common/models'
import { playerSelectors } from '@audius/common/store'
import {
  IconWaveForm as IconVisualizer,
  IconButton,
  useTheme,
  Box,
  Paper
} from '@audius/harmony'
import { animated, useSpring } from '@react-spring/web'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'

import { Draggable } from 'components/dragndrop'
import DynamicImage from 'components/dynamic-image/DynamicImage'
import { TrackDogEar } from 'components/track/TrackDogEar'
import {
  useTrackCoverArt,
  useTrackCoverArtDominantColor
} from 'hooks/useTrackCoverArt'
import { NO_VISUALIZER_ROUTES } from 'pages/visualizer/Visualizer'
import { openVisualizer } from 'pages/visualizer/store/slice'
import { fullTrackPage } from 'utils/route'

const { getTrackId } = playerSelectors

const messages = {
  viewTrack: 'View currently playing track',
  showVisualizer: 'Show Visualizer'
}

const AnimatedPaper = animated(Paper)

export const NowPlayingArtworkTile = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const { pathname } = location
  const { color, spacing, motion } = useTheme()

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

  const trackCoverArtImage = useTrackCoverArt({
    trackId: trackId ?? undefined,
    size: SquareSizes.SIZE_480_BY_480
  })

  const handleShowVisualizer = useCallback(
    (event: MouseEvent) => {
      if (NO_VISUALIZER_ROUTES.has(pathname)) return
      event.preventDefault()
      dispatch(openVisualizer())
    },
    [pathname, dispatch]
  )

  const coverArtColor = useTrackCoverArtDominantColor({
    trackId: trackId ?? undefined
  })

  const slideInProps = useSpring({
    from: { opacity: 0, height: 0 },
    to:
      permalink && trackId
        ? { opacity: 1, height: 208 }
        : { opacity: 0, height: 0 }
  })

  if (!permalink || !trackId) return null

  const renderCoverArt = () => {
    return (
      <AnimatedPaper
        border='default'
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
        <Link to={permalink} aria-label={messages.viewTrack}>
          <DynamicImage useSkeleton={false} image={trackCoverArtImage}>
            <IconButton
              activeColor='active'
              ripple
              css={{
                position: 'absolute',
                bottom: spacing.unit2,
                right: spacing.unit2,
                backgroundColor: color.background.white
              }}
              aria-label={messages.showVisualizer}
              onClick={handleShowVisualizer}
              icon={IconVisualizer}
              color='default'
            />
          </DynamicImage>
        </Link>
      </AnimatedPaper>
    )
  }

  const content = (
    <Box mh='auto' mb={0} css={{ position: 'relative' }} h={208} w={208}>
      <TrackDogEar trackId={trackId} />
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
