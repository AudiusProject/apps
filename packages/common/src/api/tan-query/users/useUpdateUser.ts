import { AudiusSdk, OptionalId } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { userMetadataToSdk } from '~/adapters/user'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models/Identifiers'
import { PlaylistLibrary } from '~/models/PlaylistLibrary'
import { UserMetadata } from '~/models/User'

import { primeUserData } from '../utils/primeUserData'

import { getUserQueryKey } from './useUser'

type MutationContext = {
  previousUser: UserMetadata | undefined
}

export type UpdateUserParams = {
  userId: ID
  metadata: Partial<UserMetadata>
  profilePictureFile?: File
  coverArtFile?: File
}

export const useUpdateUser = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      metadata,
      coverArtFile,
      profilePictureFile
    }: UpdateUserParams) => {
      const sdk = await audiusSdk()

      return await updateUser(
        sdk,
        userId,
        metadata,
        coverArtFile,
        profilePictureFile
      )
    },
    onMutate: async ({ userId, metadata }): Promise<MutationContext> => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: getUserQueryKey(userId) })

      // Snapshot the previous values
      const previousUser = queryClient.getQueryData(getUserQueryKey(userId))

      // Optimistically update user
      if (previousUser) {
        const updatedUser = {
          ...previousUser,
          ...metadata
        }
        primeUserData({
          users: [updatedUser],
          queryClient,
          forceReplace: true
        })
      }

      // Return context with the previous user
      return { previousUser }
    },
    onError: (_err, _, context?: MutationContext) => {
      // If the mutation fails, roll back user data
      if (context?.previousUser) {
        primeUserData({
          users: [context.previousUser],
          queryClient,
          forceReplace: true
        })
      }
    },
    onSettled: (_, __) => {
      // Always refetch after error or success to ensure cache is in sync with server
      // queryClient.invalidateQueries({ queryKey: ['user', userId] })
    }
  })
}

export async function updateUser(
  sdk: AudiusSdk,
  userId: number,
  metadata: Partial<UserMetadata> | { playlist_library: PlaylistLibrary },
  coverArtFile?: File,
  profilePictureFile?: File
) {
  const encodedUserId = OptionalId.parse(userId)
  if (!encodedUserId) throw new Error('Invalid ID')

  const sdkMetadata = userMetadataToSdk(metadata as UserMetadata)

  const response = await sdk.users.updateProfile({
    coverArtFile,
    profilePictureFile,
    userId: encodedUserId,
    metadata: sdkMetadata
  })

  return response
}
