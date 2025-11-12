import type { ImageSourcePropType } from 'react-native'
import type {
  FastImageProps as RNFastImageProps,
  Priority
} from 'react-native-fast-image'
import RNFastImage from 'react-native-fast-image'

export type FastImageProps = Omit<RNFastImageProps, 'source'> & {
  source?: ImageSourcePropType
  priority?: Priority
}

export type ImageProps = Omit<FastImageProps, 'source'>

/**
 * Utility component that wraps react-native-fast-image
 * NOTE: react-native-fast-image seems to be pretty much abandoned
 * It is also a hard blocker as we upgrade RN https://github.com/DylanVann/react-native-fast-image/issues/985
 * For the time being it's working and whenever we upgrade we should consider
 * alternatives like expo-image
 */
export const FastImage = (props: FastImageProps) => {
  const { source, priority, ...other } = props

  const imageSource = !source
    ? source
    : typeof source === 'number'
      ? source
      : Array.isArray(source)
        ? { uri: source[0].uri, priority }
        : { uri: source.uri, priority }

  return <RNFastImage source={imageSource} {...other} />
}

export const preload = RNFastImage.preload
