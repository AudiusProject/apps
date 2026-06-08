import { useCallback } from 'react'

import { useEnterContest as useEnterContestShared } from '@audius/common/hooks'
import { type ID, SquareSizes } from '@audius/common/models'

import { useNavigation } from 'app/hooks/useNavigation'

/**
 * Returns a "submit a remix to this contest" callback that pushes onto the
 * Upload navigator with artwork + genre + remix_of pre-filled. Mobile wrapper
 * around the shared common hook — handles the React Native blob/file shape
 * (RN's `File` object stores its data on `_data`) and the navigation push,
 * while the metadata shape itself comes from `@audius/common/hooks`.
 */
export const useEnterContest = (trackId: ID | undefined) => {
  const navigation = useNavigation()
  const { originalTrack, buildInitialMetadata } = useEnterContestShared(trackId)

  return useCallback(async () => {
    if (!trackId) return

    let artwork: { url: string; file: any } | undefined
    const imageUrl = originalTrack?.artwork?.[SquareSizes.SIZE_480_BY_480] ?? ''
    if (imageUrl) {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], 'image.jpg', { type: blob.type })
      artwork = {
        url: imageUrl,
        file: {
          // @ts-ignore: KJ - _data is on the file for some reason
          ...file._data,
          uri: imageUrl
        }
      }
    }

    const initialMetadata = buildInitialMetadata(artwork)
    if (!initialMetadata) return

    navigation.push('Upload', { initialMetadata })
  }, [trackId, originalTrack, buildInitialMetadata, navigation])
}
