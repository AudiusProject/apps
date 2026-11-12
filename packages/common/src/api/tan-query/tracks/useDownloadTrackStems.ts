import { Id, OptionalId } from '@audius/sdk'
import { useMutation } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { useCurrentUserId } from '../users/account/useCurrentUserId'

import { useTrack } from './useTrack'

/**
 * Builds a signed url for a zip of the track's stems. The API streams the zip
 * as it fetches each file, so callers hand the url to the platform's
 * downloader instead of waiting on a job.
 */
export const useDownloadTrackStems = ({ trackId }: { trackId: ID }) => {
  const { audiusSdk, audiusBackend } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  // Whether the parent track can be bundled into the zip. Two separate
  // conditions, and both matter:
  //   - `is_downloadable` — the artist actually offers the full track. If
  //     this is false there is no downloadable parent file at all.
  //   - `access.download` — the *gating* check ("this user is allowed to
  //     download"), which is `true` for any ungated track regardless of
  //     whether a downloadable file exists.
  const { data: parentDownloadability } = useTrack(trackId, {
    select: (track) => ({
      isDownloadable: track?.is_downloadable === true,
      hasDownloadAccess: track?.access?.download === true
    })
  })

  return useMutation({
    mutationFn: async () => {
      const sdk = await audiusSdk()
      const { data, signature } = await audiusBackend.signGatedContentRequest({
        sdk
      })

      return await sdk.tracks.getTrackStemsDownloadUrl({
        trackId: Id.parse(trackId),
        userId: OptionalId.parse(currentUserId),
        userSignature: signature,
        userData: data,
        includeParent:
          parentDownloadability?.isDownloadable === true &&
          parentDownloadability?.hasDownloadAccess === true
      })
    },
    onError: (error) => {
      console.error(error)
    }
  })
}
