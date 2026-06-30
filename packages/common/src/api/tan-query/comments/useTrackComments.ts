import { useEffect } from 'react'

import {
  GetTrackCommentsSortMethodEnum as CommentSortMethod,
  Id
} from '@audius/sdk'
import {
  useInfiniteQuery,
  useIsMutating,
  useQueryClient
} from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { commentFromSDK, transformAndCleanList } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeCommentData } from '../utils/primeCommentData'
import { primeRelatedData } from '../utils/primeRelatedData'

import {
  COMMENT_LIST_MUTATION_KEY,
  COMMENT_ROOT_PAGE_SIZE,
  messages
} from './types'
import { useComments } from './useComments'
import { getTrackCommentListQueryKey } from './utils'

export type GetCommentsByTrackArgs = {
  trackId: ID
  sortMethod: any
  pageSize?: number
}

/**
 * Base infinite query for a track's root comment IDs. Keeps a live observer on
 * the comment-list query (which uses `gcTime: 0`, so the data is evicted the
 * moment no observer is mounted) and primes individual comment data into the
 * cache. Shared by `useTrackComments` and `usePrefetchTrackComments`.
 */
const useTrackCommentsQuery = (
  {
    trackId,
    sortMethod,
    pageSize = COMMENT_ROOT_PAGE_SIZE
  }: GetCommentsByTrackArgs,
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const isMutatingCommentList = useIsMutating({
    mutationKey: COMMENT_LIST_MUTATION_KEY
  })
  const queryClient = useQueryClient()
  const { data: currentUserId } = useCurrentUserId()

  return useInfiniteQuery({
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], pages) => {
      if (lastPage?.length < pageSize) return undefined
      return (pages.length ?? 0) * pageSize
    },
    queryKey: getTrackCommentListQueryKey({ trackId, sortMethod, pageSize }),
    queryFn: async ({ pageParam }): Promise<ID[]> => {
      const sdk = await audiusSdk()
      const commentsRes = await sdk.tracks.getTrackComments({
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
    enabled:
      isMutatingCommentList === 0 && options?.enabled !== false && !!trackId
  })
}

/**
 * Warms the track comment list as early as possible (e.g. on track screen
 * mount, in parallel with the track fetch) so the comment section renders with
 * data already in cache instead of starting its fetch only once it mounts.
 *
 * Uses the default `Top` sort and page size to match what the comment section
 * requests by default, ensuring a cache hit. Keeps a live observer mounted so
 * the `gcTime: 0` query isn't evicted before the comment section mounts.
 */
export const usePrefetchTrackComments = (trackId: ID | null | undefined) => {
  useTrackCommentsQuery(
    { trackId: trackId as ID, sortMethod: CommentSortMethod.Top },
    { enabled: !!trackId }
  )
}

export const useTrackComments = (
  args: GetCommentsByTrackArgs,
  options?: QueryOptions
) => {
  const dispatch = useDispatch()

  const queryRes = useTrackCommentsQuery(args, options)

  const { error, data: commentIds } = queryRes

  useEffect(() => {
    if (error) {
      console.error(error)
      dispatch(toast({ content: messages.loadError('comments') }))
    }
  }, [error, dispatch])

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
