import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { userMetadataToSdk } from '~/adapters/user'
import { primeUserData, useQueryContext } from '~/api/tan-query/utils'
import { Feature } from '~/models/ErrorReporting'
import { UserMetadata, WriteableUserMetadata } from '~/models/User'
import { dataURLtoFile } from '~/utils'
import { squashNewLines } from '~/utils/formatUtil'

import { useCurrentUserId } from './account/useCurrentUserId'
import { getUserQueryKey } from './useUser'

export type MutationContext = {
  previousMetadata: UserMetadata | undefined
}

export const useUpdateProfile = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
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

      const { blockHash, blockNumber } = await sdk.users.updateProfile({
        userId: Id.parse(currentUserId),
        profilePictureFile: metadata.updatedProfilePicture?.file,
        coverArtFile: metadata.updatedCoverPhoto?.file,
        metadata: userMetadataToSdk(metadata)
      })

      // Wait for transaction confirmation
      const confirmed = await sdk.services.entityManager.confirmWrite({
        blockHash,
        blockNumber
      })

      if (!confirmed) {
        throw new Error(
          `Could not confirm update profile for user id ${currentUserId}`
        )
      }

      // Fetch updated user data
      const { data: userData = [] } = await sdk.full.users.getUser({
        id: Id.parse(currentUserId),
        userId: Id.parse(currentUserId)
      })

      return userData[0]
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
    onError: (error, metadata, context?: MutationContext) => {
      // If the mutation fails, roll back user data
      if (context?.previousMetadata) {
        primeUserData({
          queryClient,
          users: [{ ...context.previousMetadata, ...metadata }],
          forceReplace: true
        })
      }

      reportToSentry({
        error,
        additionalInfo: {
          metadata
        },
        feature: Feature.Edit,
        name: 'Edit Profile'
      })
    },
    onSettled: (_, __) => {
      // Always refetch after error or success to ensure cache is in sync with server
      // queryClient.invalidateQueries({
      //   queryKey: getUserQueryKey(currentUserId)
      // })
    }
  })
}
