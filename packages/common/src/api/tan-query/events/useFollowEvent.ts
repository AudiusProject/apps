import { Id, encodeHashId } from '@audius/sdk'
import {
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { Feature, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey } from '../types'

export type EventFollowState = {
  isFollowed: boolean
  followerCount: number
}

export const getEventFollowStateQueryKey = (
  eventId: ID | null | undefined
) => {
  return [
    QUERY_KEYS.eventFollowState,
    eventId
  ] as unknown as QueryKey<EventFollowState>
}

/**
 * Read-hook: is the current user subscribed to this remix-contest event?
 * Also returns the total follower count so the page can render both the
 * button state and a "X following" number without a second call.
 *
 * Backed by GET /v1/events/:eventId/follow_state — a small ad-hoc endpoint
 * we added specifically for this flow.
 */
export const useEventFollowState = (eventId: ID | null | undefined) => {
  const { audiusSdk } = useQueryContext()

  return useQuery({
    queryKey: getEventFollowStateQueryKey(eventId),
    enabled: !!eventId,
    queryFn: async (): Promise<EventFollowState> => {
      if (!eventId) {
        return { isFollowed: false, followerCount: 0 }
      }
      const sdk = await audiusSdk()
      // The generated response is already camelCased by the openapi
      // generator (see EventFollowState.ts), so no snake_case adaptation
      // needed here.
      const response = await sdk.events.getEventFollowState({
        eventId: encodeHashId(eventId)!
      })
      return {
        isFollowed: !!response.data?.isFollowed,
        followerCount: Number(response.data?.followerCount ?? 0)
      }
    }
  })
}

export const useFollowEvent = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      eventId
    }: {
      userId: ID
      eventId: ID
    }) => {
      const sdk = await audiusSdk()
      return await sdk.events.followEvent({
        userId: Id.parse(userId)!,
        eventId: Id.parse(eventId)!
      })
    },
    onMutate: async ({ eventId }) => {
      // Optimistic: flip the button immediately.
      const key = getEventFollowStateQueryKey(eventId)
      const prev = queryClient.getQueryData<EventFollowState>(key)
      queryClient.setQueryData(key, {
        isFollowed: true,
        followerCount: (prev?.followerCount ?? 0) + 1
      })
      return { prev }
    },
    onError: (error: Error, { eventId }, ctx) => {
      queryClient.setQueryData(
        getEventFollowStateQueryKey(eventId),
        ctx?.prev ?? { isFollowed: false, followerCount: 0 }
      )
      reportToSentry({
        error,
        name: 'Events',
        feature: Feature.Events
      })
      toast({ content: 'Could not follow contest. Please try again.' })
    },
    onSettled: (_data, _err, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: getEventFollowStateQueryKey(eventId)
      })
    }
  })
}

export const useUnfollowEvent = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      eventId
    }: {
      userId: ID
      eventId: ID
    }) => {
      const sdk = await audiusSdk()
      return await sdk.events.unfollowEvent({
        userId: Id.parse(userId)!,
        eventId: Id.parse(eventId)!
      })
    },
    onMutate: async ({ eventId }) => {
      const key = getEventFollowStateQueryKey(eventId)
      const prev = queryClient.getQueryData<EventFollowState>(key)
      queryClient.setQueryData(key, {
        isFollowed: false,
        followerCount: Math.max(0, (prev?.followerCount ?? 1) - 1)
      })
      return { prev }
    },
    onError: (error: Error, { eventId }, ctx) => {
      queryClient.setQueryData(
        getEventFollowStateQueryKey(eventId),
        ctx?.prev ?? { isFollowed: true, followerCount: 0 }
      )
      reportToSentry({
        error,
        name: 'Events',
        feature: Feature.Events
      })
      toast({ content: 'Could not unfollow contest. Please try again.' })
    },
    onSettled: (_data, _err, { eventId }) => {
      queryClient.invalidateQueries({
        queryKey: getEventFollowStateQueryKey(eventId)
      })
    }
  })
}
