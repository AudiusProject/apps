import type { ImageSourcePropType, ImageURISource } from 'react-native'
import { Image } from 'react-native'

export const isImageUriSource = (
  source: ImageSourcePropType
): source is ImageURISource => {
  return (source as ImageURISource)?.uri !== undefined
}

export const preload = (url: string, timeoutMs: number = 5000):Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Failed to load (timeout) ${url}`))
    }, timeoutMs)

    Image.prefetch(url)
      .then((success) => {
        clearTimeout(timer)
        if (success) {
          resolve()
        } else {
          reject(new Error(`Failed to load ${url}`))
        }
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(new Error(`Failed to load ${url}: ${err instanceof Error ? err.message : String(err)}`))
      })
  })
}
