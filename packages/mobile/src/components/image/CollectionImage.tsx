import { useState } from 'react'

import { useCollection } from '@audius/common/api'
import { useImageSize } from '@audius/common/hooks'
import type { SquareSizes, ID } from '@audius/common/models'
import { reachabilitySelectors } from '@audius/common/store'
import type { Maybe } from '@audius/common/utils'
import type { LayoutChangeEvent } from 'react-native'
import { View } from 'react-native'
import { useSelector } from 'react-redux'

import { Artwork, IconImage, preload } from '@audius/harmony-native'
import type { ImageProps } from '@audius/harmony-native'
import { getLocalCollectionCoverArtPath } from 'app/services/offline-downloader'
import { getCollectionDownloadStatus } from 'app/store/offline-downloads/selectors'
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

export const useLocalCollectionImageUri = (collectionId: Maybe<ID>) => {
  const collectionImageUri = useSelector((state) => {
    if (!collectionId) return null

    const isReachable = getIsReachable(state)
    if (isReachable) return null

    const collectionDownloadStatus = getCollectionDownloadStatus(
      state,
      collectionId
    )
    const isDownloaded =
      collectionDownloadStatus === OfflineDownloadStatus.SUCCESS

    if (!isDownloaded) return null

    return `file://${getLocalCollectionCoverArtPath(collectionId.toString())}`
  })

  return primitiveToImageSource(collectionImageUri)
}

export const useCollectionImage = ({
  collectionId,
  size
}: {
  collectionId: Maybe<ID>
  size: SquareSizes
}) => {
  const { data: artworkData } = useCollection(collectionId, {
    select: (collection) =>
      collection != null
        ? {
            artwork: collection.artwork,
            hasNoArtwork: !hasValidArtwork(collection.artwork)
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

  if (hasNoArtwork || artworkData === undefined) {
    return { source: undefined, hasNoArtwork: true, onError: onImageError }
  }

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
    return { source: undefined, hasNoArtwork: true, onError: onImageError }
  }

  return {
    source: primitiveToImageSource(imageUrl),
    hasNoArtwork: false,
    onError: onImageError
  }
}

type CollectionImageProps = {
  collectionId: ID
  size: SquareSizes
  style?: ImageProps['style']
  onLoad?: ImageProps['onLoad']
  onError?: ImageProps['onError']
  children?: React.ReactNode
}

export const CollectionImage = (props: CollectionImageProps) => {
  const { collectionId, size, style, onLoad, onError, ...other } = props

  const { staticWhite } = useThemeColors()
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 })
  const localCollectionImageUri = useLocalCollectionImageUri(collectionId)
  const collectionImageSource = useCollectionImage({ collectionId, size })
  const {
    source: loadedSource,
    onError: onImageError,
    hasNoArtwork
  } = collectionImageSource

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
    hasNoArtwork === true
      ? undefined
      : (loadedSource ?? localCollectionImageUri)

  const handleError = (error: { nativeEvent: { error: string } }) => {
    if (source && typeof source === 'object' && 'uri' in source) {
      onImageError?.(source.uri as string)
    }
    onError?.(error)
  }

  return (
    <Artwork
      {...other}
      source={source}
      onLoad={onLoad}
      onError={handleError}
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
    </Artwork>
  )
}
