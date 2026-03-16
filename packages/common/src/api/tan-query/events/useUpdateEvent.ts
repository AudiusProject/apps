import { EventEntityTypeEnum, EventEventTypeEnum } from '@audius/sdk/services'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
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
  const { audiusSdk, reportToSentry } = useQueryContext()
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
      reportToSentry({
        error,
        additionalInfo: args,
        name: 'Events',
        feature: Feature.Events
      })

      // Revert the optimistic updates
      if (context?.previousEvent) {
        queryClient.setQueryData(
          getEventQueryKey(args.eventId),
          context.previousEvent
        )
      }

      // Toast generic error message
      toast({
        content: 'There was an error updating the event. Please try again'
      })
    }
  })
}
