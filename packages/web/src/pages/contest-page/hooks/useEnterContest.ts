import { useEnterContest as useEnterContestShared } from '@audius/common/hooks'
import { type ID, SquareSizes } from '@audius/common/models'
import { UPLOAD_PAGE } from '@audius/common/src/utils/route'
import type { TrackMetadataForUpload } from '@audius/common/store'

import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'

/**
 * Returns a "submit a remix to this contest" callback that deep-links into
 * the upload flow with artwork + genre + remix_of pre-filled. Web wrapper
 * around the shared common hook — handles the Web `File` blob fetch and the
 * navigation + auth gate, while the metadata shape itself comes from
 * `@audius/common/hooks`.
 */
export const useEnterContest = (trackId: ID | undefined) => {
  const navigate = useNavigateToPage()
  const { originalTrack, buildInitialMetadata } = useEnterContestShared(trackId)

  return useRequiresAccountCallback(async () => {
    if (!trackId) return

    let artwork: { url: string; file: File } | undefined
    const imageUrl =
      originalTrack?.artwork?.[SquareSizes.SIZE_1000_BY_1000] ?? ''
    if (imageUrl) {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      artwork = {
        url: imageUrl,
        file: new File([blob], 'image.jpg', { type: blob.type })
      }
    }

    const initialMetadata = buildInitialMetadata(artwork)
    if (!initialMetadata) return

    const state: { initialMetadata: Partial<TrackMetadataForUpload> } = {
      initialMetadata
    }
    navigate(UPLOAD_PAGE, state)
  }, [trackId, navigate, originalTrack, buildInitialMetadata])
}
