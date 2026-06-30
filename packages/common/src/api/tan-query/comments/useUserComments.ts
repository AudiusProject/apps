import { useEffect } from 'react'

import { Id, OptionalId } from '@audius/sdk'
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

export const useUserComments = (
  {
    userId,
    pageSize = COMMENT_ROOT_PAGE_SIZE
  }: {
    userId: ID | null | undefined
    pageSize?: number
  },
  options?: QueryOptions
) => {
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()
  const isMutatingCommentList = useIsMutating({
    mutationKey: COMMENT_LIST_MUTATION_KEY
  })
  const queryClient = useQueryClient()
  const dispatch = useDispatch()

  const queryRes = useInfiniteQuery({
    initialPageParam: 0,
    getNextPageParam: (lastPage: ID[], pages) => {
      if (lastPage?.length < pageSize) return undefined
      return (pages.length ?? 0) * pageSize
    },
    queryKey: ['userCommentList', userId, pageSize],
    queryFn: async ({ pageParam }): Promise<ID[]> => {
      const sdk = await audiusSdk()
      const commentsRes = await sdk.users.getUserComments({
        id: Id.parse(userId),
        userId: OptionalId.parse(currentUserId),
        offset: pageParam,
        limit: pageSize
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
    ...options,
    enabled:
      isMutatingCommentList === 0 && options?.enabled !== false && !!userId
  })

  const { error, data: commentIds } = queryRes

  useEffect(() => {
    if (error) {
      console.error(error)
      dispatch(toast({ content: messages.loadError('comments') }))
    }
  }, [error, dispatch])

  const { data: comments } = useComments(commentIds)

  return {
    data: comments,
    isPending: queryRes.isPending,
    isLoading: queryRes.isLoading,
    hasNextPage: queryRes.hasNextPage,
    isFetchingNextPage: queryRes.isFetchingNextPage,
    fetchNextPage: queryRes.fetchNextPage
  }
}
