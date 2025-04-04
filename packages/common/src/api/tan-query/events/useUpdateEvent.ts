import { EventEntityTypeEnum, EventEventTypeEnum } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useAudiusQueryContext } from '~/audius-query'
import { Event, Feature, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

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
  const { audiusSdk, reportToSentry } = useAudiusQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: UpdateEventArgs) => {
      const sdk = await audiusSdk()
      return await sdk.events.updateEvent({ ...args })
    },
    onMutate: async (args: UpdateEventArgs) => {
      const { eventId, ...updates } = args

      // Get the current event from cache
      const currentEvent = queryClient.getQueryData(getEventQueryKey(eventId))
      if (!currentEvent) return

      const updatedEvent: Event = {
        ...currentEvent,
        ...updates,
        updatedAt: new Date().toISOString()
      }

      // Update the event cache
      queryClient.setQueryData(getEventQueryKey(eventId), updatedEvent)

      // Return context for rollback
      return { previousEvent: currentEvent }
    },
    onError: (error: Error, args, context) => {
      // Revert the optimistic update
      if (context?.previousEvent) {
        queryClient.setQueryData(
          getEventQueryKey(args.eventId),
          context.previousEvent
        )
      }

      reportToSentry({
        error,
        additionalInfo: args,
        name: 'Events',
        feature: Feature.Events
      })

      toast({
        content: 'There was an error updating the event. Please try again'
      })
    }
  })
}
