import { useTrack, useUser } from '@audius/common/api'
import { type ID, SquareSizes } from '@audius/common/models'
import { UPLOAD_PAGE } from '@audius/common/src/utils/route'
import type { TrackMetadataForUpload } from '@audius/common/store'

import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'

/**
 * Returns a "submit a remix to this contest" callback that deep-links
 * into the upload flow with the source track's artwork + genre +
 * remix_of pre-filled. Mirrors the behaviour of
 * `RemixContestSection.goToUploadWithRemix` on the desktop track page,
 * extracted so contest pages can reuse the same shape.
 *
 * Why pre-fill artwork + genre: every submission to a remix contest
 * shares the contest's source-track context. Forcing the submitter to
 * re-upload artwork and re-pick a genre adds friction with no signal
 * gained. We default both fields and let the user override before
 * publishing.
 */
export const useEnterContest = (trackId: ID | undefined) => {
  const navigate = useNavigateToPage()
  const { data: originalTrack } = useTrack(trackId)
  const { data: originalUser } = useUser(originalTrack?.owner_id)

  return useRequiresAccountCallback(async () => {
    if (!trackId) return

    let file: File | undefined
    const imageUrl =
      originalTrack?.artwork?.[SquareSizes.SIZE_1000_BY_1000] ?? ''
    if (imageUrl) {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      file = new File([blob], 'image.jpg', { type: blob.type })
    }

    const state: { initialMetadata: Partial<TrackMetadataForUpload> } = {
      initialMetadata: {
        ...(file
          ? {
              artwork: {
                url: imageUrl,
                file
              }
            }
          : {}),
        genre: originalTrack?.genre ?? '',
        remix_of: {
          tracks: [
            {
              parent_track_id: trackId,
              user: originalUser,
              has_remix_author_reposted: false,
              has_remix_author_saved: false
            }
          ]
        }
      }
    }
    navigate(UPLOAD_PAGE, state)
  }, [trackId, navigate, originalTrack, originalUser])
}
