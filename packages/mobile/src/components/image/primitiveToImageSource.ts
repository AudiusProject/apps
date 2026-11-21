import type { ImageSourcePropType } from 'react-native'

export const primitiveToImageSource = (
  src: string | number | undefined | null
): ImageSourcePropType | undefined =>
  typeof src === 'string' ? { uri: src } : (src ?? undefined)
