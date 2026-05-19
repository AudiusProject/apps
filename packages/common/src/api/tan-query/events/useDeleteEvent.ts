import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cloneDeep } from 'lodash'

import { useQueryContext } from '~/api/tan-query/utils'
import { Event, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { getEventQueryKey, getEventIdsByEntityIdQueryKey } from './utils'

export type DeleteEventArgs = {
  eventId: ID
  userId: ID
}

export const useDeleteEvent = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: DeleteEventArgs) => {
      const sdk = await audiusSdk()
      return await sdk.events.deleteEvent({ ...args })
    },
    onMutate: async (args: DeleteEventArgs) => {
      const { eventId } = args

      // Get the current event from cache
      const currentEvent = queryClient.getQueryData(getEventQueryKey(eventId))
      if (!currentEvent) return

      const { entityId, entityType, eventType } = currentEvent

      const deletedEvent: Event = {
        ...currentEvent,
        isDeleted: true,
        updatedAt: new Date().toISOString()
      }

      // Update the event cache
      queryClient.setQueryData(getEventQueryKey(eventId), deletedEvent)

      // Remove event from the list of events for the entity
      let prevEntityState: ID[] = []
      if (entityId) {
        queryClient.setQueryData(
          getEventIdsByEntityIdQueryKey({ entityId, entityType }),
          (prevData) => {
            const newState = cloneDeep(prevData) ?? []
            prevEntityState = newState
            newState.splice(newState.indexOf(eventId), 1)
            return newState
          }
        )
      }

      // Remove event from the list of events for the entity by event type
      let prevEventTypeState: ID[] = []
      if (entityId) {
        queryClient.setQueryData(
          getEventIdsByEntityIdQueryKey({ entityId, entityType, eventType }),
          (prevData) => {
            const newState = cloneDeep(prevData) ?? []
            prevEventTypeState = newState
            newState.splice(newState.indexOf(eventId), 1)
            return newState
          }
        )
      }

      // Return context for rollback
      return {
        previousEvent: currentEvent,
        prevEntityState,
        prevEventTypeState
      }
    },
    onError: (error: Error, args, context) => {
      // Revert the optimistic update
      if (context?.previousEvent) {
        queryClient.setQueryData(
          getEventQueryKey(args.eventId),
          context.previousEvent
        )
      }

      const { eventId } = args
      const prevEntityState = context?.prevEntityState
      const prevEventTypeState = context?.prevEventTypeState

      // Get the current event from cache
      const currentEvent = queryClient.getQueryData(getEventQueryKey(eventId))

      if (prevEntityState && currentEvent) {
        queryClient.setQueryData(
          getEventIdsByEntityIdQueryKey({
            entityId: currentEvent.entityId,
            entityType: currentEvent.entityType
          }),
          prevEntityState
        )
      }

      if (prevEventTypeState && currentEvent) {
        queryClient.setQueryData(
          getEventIdsByEntityIdQueryKey({
            entityId: currentEvent.entityId,
            entityType: currentEvent.entityType,
            eventType: currentEvent.eventType
          }),
          prevEventTypeState
        )
      }

      console.error(error)

      toast({
        content: 'There was an error deleting the event. Please try again'
      })
    }
  })
}
