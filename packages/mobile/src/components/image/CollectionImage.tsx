import { useCollection } from '@audius/common/api'
import { useImageSize } from '@audius/common/hooks'
import type { SquareSizes, ID } from '@audius/common/models'
import { reachabilitySelectors } from '@audius/common/store'
import type { Maybe } from '@audius/common/utils'
import { useSelector } from 'react-redux'

import { Image, preload, useTheme } from '@audius/harmony-native'
import type { ImageProps } from '@audius/harmony-native'
import imageEmpty from 'app/assets/images/imageBlank2x.png'
import { getLocalCollectionCoverArtPath } from 'app/services/offline-downloader'
import { getCollectionDownloadStatus } from 'app/store/offline-downloads/selectors'
import { OfflineDownloadStatus } from 'app/store/offline-downloads/slice'
import { useThemeColors } from 'app/utils/theme'

import { primitiveToImageSource } from './primitiveToImageSource'

const { getIsReachable } = reachabilitySelectors

const useLocalCollectionImageUri = (collectionId: Maybe<ID>) => {
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
  const { data: artwork } = useCollection(collectionId, {
    select: (collection) => collection.artwork
  })
  const { imageUrl, onError: onImageError } = useImageSize({
    artwork,
    targetSize: size,
    defaultImage: '',
    preloadImageFn: async (url: string) => {
      await preload([{ uri: url }])
    }
  })

  if (imageUrl === '') {
    return {
      source: imageEmpty,
      isFallbackImage: true,
      onError: onImageError
    }
  }

  // Return edited artwork from this session, if it exists
  // TODO(PAY-3588) Update field once we've switched to another property name
  // for local changes to artwork
  // @ts-ignore
  if (artwork?.url) {
    return {
      // @ts-ignore
      source: primitiveToImageSource(artwork.url),
      isFallbackImage: false,
      onError: onImageError
    }
  }

  return {
    source: primitiveToImageSource(imageUrl),
    isFallbackImage: false,
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

  const localCollectionImageUri = useLocalCollectionImageUri(collectionId)
  const collectionImageSource = useCollectionImage({ collectionId, size })
  const { cornerRadius } = useTheme()
  const { skeleton } = useThemeColors()
  const {
    source: loadedSource,
    isFallbackImage,
    onError: onImageError
  } = collectionImageSource

  const source = loadedSource ?? localCollectionImageUri

  const handleError = (error: { nativeEvent: { error: string } }) => {
    if (source && typeof source === 'object' && 'uri' in source) {
      onImageError?.(source.uri as string)
    }
    onError?.(error)
  }

  return (
    <Image
      {...other}
      style={[
        { aspectRatio: 1, borderRadius: cornerRadius.s },
        (isFallbackImage || !source) && {
          backgroundColor: skeleton
        },
        style
      ]}
      source={source}
      onLoad={onLoad}
      onError={handleError}
    />
  )
}
