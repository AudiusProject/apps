import { useMemo } from 'react'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'

import { getEventsByEntityIdBatcher } from '../batchers/getEventsByEntityIdBatcher'
import { SelectableQueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'

import {
  getEventIdsByEntityIdQueryKey,
  EventIdsByEntityIdOptions,
  getEventQueryKey
} from './utils'

export const useEventIdsByEntityId = (
  args: EventIdsByEntityIdOptions,
  options?: SelectableQueryOptions<ID[]>
) => {
  const { entityId } = args ?? {}
  const { audiusSdk } = useQueryContext()
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()
  const queryClient = useQueryClient()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const select = useMemo(() => options?.select, [])

  const queryData = useQuery({
    queryKey: getEventIdsByEntityIdQueryKey(args),
    queryFn: async () => {
      const sdk = await audiusSdk()

      const batchGetEvents = getEventsByEntityIdBatcher({
        sdk,
        currentUserId,
        queryClient,
        dispatch
      })

      const events = await batchGetEvents.fetch(entityId!)

      events.forEach((event) => {
        queryClient.setQueryData(getEventQueryKey(event.eventId), event)
      })

      return events.map((event) => event.eventId)
    },
    ...options,
    enabled: options?.enabled !== false && !!entityId,
    select
  })

  return queryData
}
