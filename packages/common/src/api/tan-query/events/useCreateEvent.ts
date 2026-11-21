import { EventEventTypeEnum, EventEntityTypeEnum } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cloneDeep } from 'lodash'

import { useQueryContext } from '~/api/tan-query/utils'
import { Event, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { QUERY_KEYS } from '../queryKeys'

import { getEventQueryKey, getEventIdsByEntityIdQueryKey } from './utils'

export type CreateEventArgs = {
  eventId?: ID
  eventType: EventEventTypeEnum
  userId: ID
  entityType?: EventEntityTypeEnum
  entityId?: ID
  endDate?: string
  eventData?: Record<string, any>
}

export const useCreateEvent = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: CreateEventArgs) => {
      const sdk = await audiusSdk()
      return await sdk.events.createEvent(args)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.remixContestsList]
      })
    },
    onMutate: async (args: CreateEventArgs) => {
      const { userId, eventType, entityType, entityId, endDate, eventData } =
        args
      const sdk = await audiusSdk()
      const newId = await sdk.events.generateEventId()
      args.eventId = newId

      const newEvent: Event = {
        eventId: newId,
        entityId: entityId ?? null,
        entityType,
        userId,
        eventType,
        isDeleted: false,
        endDate,
        eventData: eventData ?? {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      queryClient.setQueryData(getEventQueryKey(newId), newEvent)

      let prevEntityState: ID[] = []
      queryClient.setQueryData(
        getEventIdsByEntityIdQueryKey({ entityId, entityType }),
        (prevData) => {
          const newState = cloneDeep(prevData) ?? []
          prevEntityState = newState
          newState.unshift(newEvent.eventId)
          return newState
        }
      )

      let prevEventTypeState: ID[] = []
      queryClient.setQueryData(
        getEventIdsByEntityIdQueryKey({ entityId, entityType, eventType }),
        (prevData) => {
          const newState = cloneDeep(prevData) ?? []
          prevEventTypeState = newState
          newState.unshift(newEvent.eventId)
          return newState
        }
      )

      return { prevEntityState, prevEventTypeState }
    },
    onError: (error: Error, args, context) => {
      console.error(error)

      queryClient.resetQueries({
        queryKey: getEventQueryKey(args.eventId)
      })

      const prevEntityState = context?.prevEntityState
      if (prevEntityState) {
        queryClient.setQueryData(
          getEventIdsByEntityIdQueryKey({
            entityId: args.entityId,
            entityType: args.entityType
          }),
          prevEntityState
        )
      }

      const prevEventTypeState = context?.prevEventTypeState
      if (prevEventTypeState) {
        queryClient.setQueryData(
          getEventIdsByEntityIdQueryKey({
            entityId: args.entityId,
            entityType: args.entityType,
            eventType: args.eventType
          }),
          prevEventTypeState
        )
      }

      toast({
        content: 'There was an error creating the event. Please try again'
      })
    }
  })
}
