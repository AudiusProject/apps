import { Id, OptionalId } from '@audius/sdk'
import { useMutation } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'

import { useCurrentUserId } from '../users/account/useCurrentUserId'

import { useTrack } from './useTrack'

export const useDownloadTrackStems = ({ trackId }: { trackId: ID }) => {
  const { audiusSdk, audiusBackend } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

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
