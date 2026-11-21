import { EventEntityTypeEnum, EventEventTypeEnum } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { Event, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { QUERY_KEYS } from '../queryKeys'

import { getEventQueryKey } from './utils'

export type UpdateEventArgs = {
  eventId: ID
  userId: ID
  eventType?: EventEventTypeEnum
  entityType?: EventEntityTypeEnum
  entityId?: ID
  endDate?: string
  eventData?: Record<string, any>
}

export const useUpdateEvent = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: UpdateEventArgs) => {
      const sdk = await audiusSdk()
      return await sdk.events.updateEvent({ ...args })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.remixContestsList]
      })
    },
    onMutate: async (args: UpdateEventArgs) => {
      const { eventId, ...updates } = args

      const currentEvent = queryClient.getQueryData(getEventQueryKey(eventId))
      if (!currentEvent) return

      const updatedEvent: Event = {
        ...currentEvent,
        ...updates,
        updatedAt: new Date().toISOString()
      }

      queryClient.setQueryData(getEventQueryKey(eventId), updatedEvent)

      return { previousEvent: currentEvent }
    },
    onError: (error: Error, args, context) => {
      console.error(error)

      if (context?.previousEvent) {
        queryClient.setQueryData(
          getEventQueryKey(args.eventId),
          context.previousEvent
        )
      }

      toast({
        content: 'There was an error updating the event. Please try again'
      })
    }
  })
}
