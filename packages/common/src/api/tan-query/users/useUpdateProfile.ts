import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { userMetadataToSdk } from '~/adapters/user'
import { primeUserData, useQueryContext } from '~/api/tan-query/utils'
import { UserMetadata, WriteableUserMetadata } from '~/models/User'
import { dataURLtoFile } from '~/utils'
import { squashNewLines } from '~/utils/formatUtil'

import { useCurrentUserId } from './account/useCurrentUserId'
import { getUserQueryKey } from './useUser'

export type MutationContext = {
  previousMetadata: UserMetadata | undefined
}

export const useUpdateProfile = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  return useMutation({
    mutationFn: async (metadata: WriteableUserMetadata) => {
      const sdk = await audiusSdk()
      metadata.bio = squashNewLines(metadata.bio) ?? null

      // For base64 images (coming from native), convert to a blob
      if (metadata.updatedCoverPhoto?.type === 'base64') {
        const file = await dataURLtoFile(
          metadata.updatedCoverPhoto.file as unknown as string
        )
        if (file) {
          metadata.updatedCoverPhoto.file = file
        }
      }

      if (metadata.updatedProfilePicture?.type === 'base64') {
        const file = await dataURLtoFile(
          metadata.updatedProfilePicture.file as unknown as string
        )
        if (file) {
          metadata.updatedProfilePicture.file = file
        }
      }

      await sdk.users.updateUser({
        id: Id.parse(currentUserId),
        userId: Id.parse(currentUserId),
        profilePictureFile: metadata.updatedProfilePicture?.file,
        coverArtFile: metadata.updatedCoverPhoto?.file,
        metadata: userMetadataToSdk(metadata)
      })

      // Fetch updated user data
      const response = await sdk.users.getUser({
        id: Id.parse(currentUserId),
        userId: Id.parse(currentUserId)
      })

      return response.data
    },
    onMutate: async (metadata): Promise<MutationContext> => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: getUserQueryKey(currentUserId)
      })

      // Snapshot the previous values
      const previousMetadata = queryClient.getQueryData(
        getUserQueryKey(currentUserId)
      )

      // Optimistically update user data
      if (previousMetadata) {
        primeUserData({
          queryClient,
          users: [{ ...previousMetadata, ...metadata }],
          forceReplace: true
        })
      }

      return { previousMetadata }
    },
    onSuccess: (_data, variables) => {
      // Re-confirm the mutation in the cache after server success.
      // We re-apply mutation variables rather than the raw server response
      // to guard against discovery-node propagation lag: the node answering
      // getUser may not yet have indexed the confirmed block.
      const currentCache = queryClient.getQueryData<UserMetadata>(
        getUserQueryKey(currentUserId)
      )
      if (currentCache) {
        primeUserData({
          queryClient,
          users: [{ ...currentCache, ...variables }],
          forceReplace: true
        })
      }
    },
    onError: (error, _metadata, context?: MutationContext) => {
      // If the mutation fails, roll back user data to previous state
      if (context?.previousMetadata) {
        primeUserData({
          queryClient,
          users: [context.previousMetadata],
          forceReplace: true
        })
      }

      console.error(error)
    },
    onSettled: (_, __) => {
      // Always refetch after error or success to ensure cache is in sync with server
      // queryClient.invalidateQueries({
      //   queryKey: getUserQueryKey(currentUserId)
      // })
    }
  })
}
