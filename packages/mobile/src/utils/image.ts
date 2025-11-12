import type { ImageSourcePropType, ImageURISource } from 'react-native'

export const isImageUriSource = (
  source: ImageSourcePropType
): source is ImageURISource => {
  return (source as ImageURISource)?.uri !== undefined
}
