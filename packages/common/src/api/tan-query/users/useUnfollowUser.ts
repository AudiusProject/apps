import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils/QueryContext'
import { useAppContext } from '~/context/appContext'
import { Name, FollowSource } from '~/models/Analytics'
import { Feature } from '~/models/ErrorReporting'
import { ID } from '~/models/Identifiers'
import { UserMetadata } from '~/models/User'
import { removeFolloweeId } from '~/store/gated-content/slice'
import { revokeFollowGatedAccess } from '~/store/tipping/slice'

import { primeUserData } from '../utils/primeUserData'

import { useCurrentUserId } from './account/useCurrentUserId'
import { getUserQueryKey } from './useUser'

type UnfollowUserParams = {
  followeeUserId: ID | null | undefined
  source: FollowSource
}

type MutationContext = {
  previousUser: UserMetadata | undefined
}

export const useUnfollowUser = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const {
    analytics: { track, make }
  } = useAppContext()
  const { data: currentUserId } = useCurrentUserId()

  return useMutation({
    mutationFn: async ({ followeeUserId, source }: UnfollowUserParams) => {
      if (!currentUserId || !followeeUserId) {
        return
      }

      const sdk = await audiusSdk()
      await sdk.users.unfollowUser({
        userId: Id.parse(currentUserId),
        followeeUserId: Id.parse(followeeUserId)
      })

      // Handle gated content
      dispatch(removeFolloweeId({ id: followeeUserId }))

      dispatch(revokeFollowGatedAccess({ userId: followeeUserId }))

      // Track the unfollow
      if (source) {
        track(
          make({
            eventName: Name.UNFOLLOW,
            id: followeeUserId.toString(),
            source
          })
        )
      }
    },
    onMutate: async ({ followeeUserId }) => {
      if (!followeeUserId || !currentUserId) {
        return { previousUser: undefined }
      }

      await queryClient.cancelQueries({
        queryKey: getUserQueryKey(followeeUserId)
      })

      const previousUser = queryClient.getQueryData(
        getUserQueryKey(followeeUserId)
      )

      const followeeUpdate = {
        does_current_user_follow: false,
        follower_count: Math.max((previousUser?.follower_count ?? 0) - 1, 0)
      }
      if (previousUser) {
        const updatedUser = {
          ...previousUser,
          ...followeeUpdate
        }
        primeUserData({
          users: [updatedUser],
          queryClient,
          forceReplace: true
        })
      }

      const currentUser = queryClient.getQueryData(
        getUserQueryKey(currentUserId)
      )
      if (currentUser) {
        const updatedCurrentUser = {
          ...currentUser,
          followee_count: Math.max((currentUser?.followee_count ?? 0) - 1, 0)
        }
        primeUserData({
          users: [updatedCurrentUser],
          queryClient,
          forceReplace: true
        })
      }

      return { previousUser }
    },
    onError: (
      error,
      { followeeUserId },
      context: MutationContext | undefined
    ) => {
      const { previousUser } = context ?? {}

      if (previousUser) {
        primeUserData({
          users: [previousUser],
          queryClient,
          forceReplace: true
        })
      }

      reportToSentry({
        error,
        additionalInfo: {
          followeeUserId
        },
        feature: Feature.Social,
        name: 'Unfollow User'
      })
    }
  })
}
