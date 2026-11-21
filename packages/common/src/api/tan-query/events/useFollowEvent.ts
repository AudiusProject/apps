import { encodeHashId } from '@audius/sdk'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

export type EventFollowState = {
  isFollowed: boolean
  followerCount: number
}

export const getEventFollowStateQueryKey = (
  eventId: ID | null | undefined,
  currentUserId?: ID | null
) => {
  return [
    QUERY_KEYS.eventFollowState,
    eventId,
    currentUserId ?? null
  ] as unknown as QueryKey<EventFollowState>
}

export const useEventFollowState = (eventId: ID | null | undefined) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  return useQuery({
    queryKey: getEventFollowStateQueryKey(eventId, currentUserId),
    enabled: !!eventId,
    queryFn: async (): Promise<EventFollowState> => {
      if (!eventId) {
        return { isFollowed: false, followerCount: 0 }
      }
      const sdk = await audiusSdk()
      const response = await sdk.events.getEventFollowState({
        eventId: encodeHashId(eventId)!,
        userId: currentUserId ? encodeHashId(currentUserId)! : undefined
      })
      return {
        isFollowed: !!response.data?.isFollowed,
        followerCount: Number(response.data?.followerCount ?? 0)
      }
    }
  })
}

export const useFollowEvent = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, eventId }: { userId: ID; eventId: ID }) => {
      const sdk = await audiusSdk()
      return await sdk.events.followEvent({
        userId,
        eventId
      })
    },
    onMutate: async ({ userId, eventId }) => {
      const key = getEventFollowStateQueryKey(eventId, userId)
      const prev = queryClient.getQueryData<EventFollowState>(key)
      queryClient.setQueryData(key, {
        isFollowed: true,
        followerCount: (prev?.followerCount ?? 0) + 1
      })
      return { prev }
    },
    onError: (error: Error, { userId, eventId }, ctx) => {
      queryClient.setQueryData(
        getEventFollowStateQueryKey(eventId, userId),
        ctx?.prev ?? { isFollowed: false, followerCount: 0 }
      )
      console.error(error)
      toast({ content: 'Could not follow contest. Please try again.' })
    },
    onSettled: (_data, _err, { userId, eventId }) => {
      queryClient.invalidateQueries({
        queryKey: getEventFollowStateQueryKey(eventId, userId)
      })
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.eventFollowers, eventId]
      })
    }
  })
}

export const useUnfollowEvent = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, eventId }: { userId: ID; eventId: ID }) => {
      const sdk = await audiusSdk()
      return await sdk.events.unfollowEvent({
        userId,
        eventId
      })
    },
    onMutate: async ({ userId, eventId }) => {
      const key = getEventFollowStateQueryKey(eventId, userId)
      const prev = queryClient.getQueryData<EventFollowState>(key)
      queryClient.setQueryData(key, {
        isFollowed: false,
        followerCount: Math.max(0, (prev?.followerCount ?? 1) - 1)
      })
      return { prev }
    },
    onError: (error: Error, { userId, eventId }, ctx) => {
      queryClient.setQueryData(
        getEventFollowStateQueryKey(eventId, userId),
        ctx?.prev ?? { isFollowed: true, followerCount: 0 }
      )
      console.error(error)
      toast({ content: 'Could not unfollow contest. Please try again.' })
    },
    onSettled: (_data, _err, { userId, eventId }) => {
      queryClient.invalidateQueries({
        queryKey: getEventFollowStateQueryKey(eventId, userId)
      })
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.eventFollowers, eventId]
      })
    }
  })
}
