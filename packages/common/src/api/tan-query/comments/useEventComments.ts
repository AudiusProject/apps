import { useEffect } from 'react'

import { encodeHashId, OptionalId } from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { commentFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeCommentData } from '../utils/primeCommentData'
import { primeRelatedData } from '../utils/primeRelatedData'

const EVENT_COMMENTS_PAGE_SIZE = 20

export type EventCommentsFeedItem = { commentId: ID }

export const getEventCommentsQueryKey = ({
  eventId,
  sortMethod
}: {
  eventId: ID | null | undefined
  sortMethod?: string
}) => {
  return [
    QUERY_KEYS.eventComments,
    eventId,
    { sortMethod }
  ] as unknown as QueryKey<EventCommentsFeedItem[]>
}

type UseEventCommentsArgs = {
  eventId: ID | null | undefined
  sortMethod?: 'top' | 'newest' | 'timestamp'
  pageSize?: number
  enabled?: boolean
}

export const useEventComments = ({
  eventId,
  sortMethod = 'newest',
  pageSize = EVENT_COMMENTS_PAGE_SIZE,
  enabled = true
}: UseEventCommentsArgs) => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()

  const queryRes = useInfiniteQuery({
    initialPageParam: 0,
    getNextPageParam: (lastPage: EventCommentsFeedItem[], pages) => {
      if (!lastPage || lastPage.length < pageSize) return undefined
      return (pages.length ?? 0) * pageSize
    },
    queryKey: getEventCommentsQueryKey({ eventId, sortMethod }),
    queryFn: async ({ pageParam }): Promise<EventCommentsFeedItem[]> => {
      if (!eventId) return []
      const sdk = await audiusSdk()
      const response = await sdk.events.getEventComments({
        eventId: encodeHashId(eventId)!,
        userId: OptionalId.parse(currentUserId ?? undefined),
        offset: pageParam,
        limit: pageSize,
        sortMethod
      })

      primeRelatedData({ related: response.related, queryClient })

      const items: EventCommentsFeedItem[] = []
      for (const raw of response.data ?? []) {
        const comment = commentFromSDK(raw)
        if (comment) {
          primeCommentData({ comments: [comment], queryClient })
          items.push({ commentId: comment.id })
        }
      }
      return items
    },
    select: (data) => data.pages.flat(),
    enabled: enabled && !!eventId
  })

  const { error } = queryRes

  useEffect(() => {
    if (error) {
      console.error(error)
      dispatch(
        toast({
          content:
            'There was an error loading the contest feed. Please try again.'
        })
      )
    }
  }, [error, dispatch])

  return queryRes
}
