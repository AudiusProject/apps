import { useState } from 'react'

import { useTrack } from '@audius/common/api'
import { useImageSize } from '@audius/common/hooks'
import type { SquareSizes, ID } from '@audius/common/models'
import { reachabilitySelectors } from '@audius/common/store'
import type { Maybe } from '@audius/common/utils'
import type { LayoutChangeEvent } from 'react-native'
import { View } from 'react-native'
import { useSelector } from 'react-redux'

import type { CornerRadiusOptions, ImageProps } from '@audius/harmony-native'
import { Artwork, IconImage, preload } from '@audius/harmony-native'
import { getLocalTrackCoverArtPath } from 'app/services/offline-downloader'
import { getTrackDownloadStatus } from 'app/store/offline-downloads/selectors'
import { OfflineDownloadStatus } from 'app/store/offline-downloads/slice'
import { useThemeColors } from 'app/utils/theme'

import { primitiveToImageSource } from './primitiveToImageSource'

const { getIsReachable } = reachabilitySelectors

const EMPTY_ICON_MIN = 12
const EMPTY_ICON_MAX = 128
const EMPTY_ICON_RATIO = 0.35

const hasValidArtwork = (artwork: unknown): boolean =>
  !!artwork &&
  typeof artwork === 'object' &&
  Object.entries(artwork as Record<string, unknown>).some(
    ([k, v]) => k !== 'mirrors' && typeof v === 'string' && v.length > 0
  )

const useLocalTrackImageUri = (trackId: Maybe<ID>) => {
  const trackImageUri = useSelector((state) => {
    if (!trackId) return null

    const isReachable = getIsReachable(state)
    if (isReachable) return null

    const trackDownloadStatus = getTrackDownloadStatus(state, trackId)
    const isDownloaded = trackDownloadStatus === OfflineDownloadStatus.SUCCESS
    if (!isDownloaded) return null

    return `file://${getLocalTrackCoverArtPath(trackId.toString())}`
  })

  return primitiveToImageSource(trackImageUri)
}

export const useTrackImage = ({
  trackId,
  size
}: {
  trackId?: ID
  size: SquareSizes
}) => {
  const { data: artworkData } = useTrack(trackId, {
    select: (track) =>
      track != null
        ? {
            artwork: track.artwork,
            hasNoArtwork: !hasValidArtwork(track.artwork)
          }
        : undefined
  })
  const artwork = artworkData?.artwork
  const hasNoArtwork = artworkData?.hasNoArtwork ?? false
  const { imageUrl, onError: onImageError } = useImageSize({
    artwork,
    targetSize: size,
    defaultImage: '',
    preloadImageFn: async (url: string) => {
      await preload([{ uri: url }])
    }
  })

  // When track has no artwork or track not loaded yet, don't pass a URL so we never show stale image
  if (hasNoArtwork || artworkData === undefined) {
    return { source: undefined, hasNoArtwork: true }
  }

  // Return edited artwork from this session, if it exists
  // @ts-expect-error - url is added for in-session edits
  if (artwork?.url) {
    return {
      // @ts-expect-error - url is added for in-session edits
      source: primitiveToImageSource(artwork.url),
      hasNoArtwork: false,
      onError: onImageError
    }
  }

  if (imageUrl === '') {
    return { source: undefined, hasNoArtwork: true }
  }

  return {
    source: primitiveToImageSource(imageUrl),
    hasNoArtwork: false,
    onError: onImageError
  }
}

type TrackImageProps = {
  trackId?: ID
  size: SquareSizes
  style?: ImageProps['style']
  borderRadius?: CornerRadiusOptions
  onLoad?: ImageProps['onLoad']
  onError?: ImageProps['onError']
  children?: React.ReactNode
}

export const TrackImage = (props: TrackImageProps) => {
  const {
    trackId,
    size,
    style,
    borderRadius = 's' as const,
    onLoad,
    onError,
    children
  } = props

  const { staticWhite } = useThemeColors()
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
  const localTrackImageUri = useLocalTrackImageUri(trackId)
  const trackImageSource = useTrackImage({ trackId, size })
  const {
    source: loadedSource,
    onError: onImageError,
    hasNoArtwork
  } = trackImageSource

  const onEmptyStateLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setContainerSize((prev) =>
      prev.w === width && prev.h === height ? prev : { w: width, h: height }
    )
  }
  const emptyIconSize =
    containerSize.w > 0 && containerSize.h > 0
      ? Math.round(
          Math.min(
            EMPTY_ICON_MAX,
            Math.max(
              EMPTY_ICON_MIN,
              Math.min(containerSize.w, containerSize.h) * EMPTY_ICON_RATIO
            )
          )
        )
      : EMPTY_ICON_MIN

  const source =
    hasNoArtwork === true ? undefined : (loadedSource ?? localTrackImageUri)

  const handleError = (error: any) => {
    try {
      if (
        source &&
        typeof source === 'object' &&
        'uri' in source &&
        typeof onImageError === 'function'
      ) {
        onImageError(source.uri as string)
      }
      if (onError && typeof onError === 'function') {
        onError(error)
      }
    } catch (e) {
      // Silently handle error handler errors to prevent stack issues
    }
  }

  return (
    <Artwork
      source={source}
      onLoad={onLoad}
      onError={handleError}
      borderRadius={borderRadius}
      style={style}
    >
      {hasNoArtwork ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1
          }}
          onLayout={onEmptyStateLayout}
          pointerEvents='none'
        >
          <IconImage
            height={emptyIconSize}
            width={emptyIconSize}
            fill={staticWhite}
          />
        </View>
      ) : null}
      {children}
    </Artwork>
  )
}
