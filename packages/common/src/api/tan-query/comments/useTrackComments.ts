import { useEffect } from 'react'

import { Id } from '@audius/sdk'
import {
  useInfiniteQuery,
  useIsMutating,
  useQueryClient
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { commentFromSDK, transformAndCleanList } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { Feature, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeCommentData } from '../utils/primeCommentData'
import { primeRelatedData } from '../utils/primeRelatedData'

import { COMMENT_ROOT_PAGE_SIZE, messages } from './types'
import { useComments } from './useComments'
import { getTrackCommentListQueryKey } from './utils'

export type GetCommentsByTrackArgs = {
  trackId: ID
  sortMethod: any
  pageSize?: number
}

export const useTrackComments = (
  {
    trackId,
    sortMethod,
    pageSize = COMMENT_ROOT_PAGE_SIZE
  }: GetCommentsByTrackArgs,
  options?: QueryOptions
) => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const isMutating = useIsMutating()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()

  const queryRes = useInfiniteQuery({
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], pages) => {
      if (lastPage?.length < pageSize) return undefined
      return (pages.length ?? 0) * pageSize
    },
    queryKey: getTrackCommentListQueryKey({ trackId, sortMethod, pageSize }),
    queryFn: async ({ pageParam }): Promise<ID[]> => {
      const sdk = await audiusSdk()
      const commentsRes = await sdk.full.tracks.getTrackComments({
        trackId: Id.parse(trackId),
        offset: pageParam,
        limit: pageSize,
        sortMethod,
        userId: currentUserId?.toString()
      })

      const commentList = transformAndCleanList(
        commentsRes.data,
        commentFromSDK
      )

      primeRelatedData({ related: commentsRes.related, queryClient })

      // Prime comment data in the cache
      primeCommentData({ comments: commentList, queryClient })

      // Return just the IDs for the infinite query
      return commentList.map((comment) => comment.id)
    },
    select: (data) => data.pages.flat(),
    staleTime: Infinity, // Stale time is set to infinity so that we never reload data thats currently shown on screen (because sorting could have changed)
    gcTime: 0, // Cache time is set to 1 so that the data is cleared any time we leave the page viewing it or change sorts
    ...options,
    enabled: isMutating === 0 && options?.enabled !== false && !!trackId
  })

  const { error, data: commentIds } = queryRes

  useEffect(() => {
    if (error) {
      reportToSentry({
        error,
        name: 'Comments',
        feature: Feature.Comments
      })
      dispatch(toast({ content: messages.loadError('comments') }))
    }
  }, [error, dispatch, reportToSentry])

  const { data: comments } = useComments(commentIds)

  return {
    commentIds,
    data: comments,
    isPending: queryRes.isPending,
    isLoading: queryRes.isLoading,
    isFetching: queryRes.isFetching,
    status: queryRes.status,
    hasNextPage: queryRes.hasNextPage,
    isFetchingNextPage: queryRes.isFetchingNextPage,
    fetchNextPage: queryRes.fetchNextPage
  }
}
