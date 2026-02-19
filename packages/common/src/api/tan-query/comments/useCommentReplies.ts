import { useEffect } from 'react'

import { Id } from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { replyCommentFromSDK, transformAndCleanList } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { Comment, Feature, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { QueryOptions } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeCommentData } from '../utils/primeCommentData'
import { primeRelatedData } from '../utils/primeRelatedData'

import { COMMENT_REPLIES_PAGE_SIZE, messages } from './types'
import { useComments } from './useComments'
import { getCommentQueryKey, getCommentRepliesQueryKey } from './utils'

export type GetRepliesArgs = {
  commentId: ID
  pageSize?: number
}

export const useCommentReplies = (
  { commentId, pageSize = COMMENT_REPLIES_PAGE_SIZE }: GetRepliesArgs,
  options?: QueryOptions
) => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const startingLimit = 3 // comments will load in with 3 already so we don't start pagination at 0
  const { data: currentUserId } = useCurrentUserId()

  const queryRes = useInfiniteQuery({
    queryKey: getCommentRepliesQueryKey({ commentId, pageSize }),
    initialPageParam: startingLimit,
    getNextPageParam: (lastPage: ID[], pages) => {
      if (lastPage?.length < pageSize) return undefined
      return (pages.length ?? pageSize) * pageSize + startingLimit
    },
    queryFn: async ({ pageParam }): Promise<ID[]> => {
      const sdk = await audiusSdk()
      const response = await sdk.comments.getCommentReplies({
        commentId: Id.parse(commentId),
        userId: currentUserId?.toString(),
        limit: pageSize,
        offset: pageParam
      })

      const replies = transformAndCleanList(response.data, replyCommentFromSDK)

      primeRelatedData({ related: response.related, queryClient })

      // Update the parent comment with the new replies and prime the reply data
      // Add the replies to our parent comment replies list
      queryClient.setQueryData(
        getCommentQueryKey(commentId),
        (comment) =>
          ({
            ...comment,
            replies: [...((comment as Comment)?.replies ?? []), ...replies]
          }) as Comment
      )

      // Prime each reply in the cache
      primeCommentData({ comments: replies, queryClient })

      // Return just the IDs for the infinite query
      return replies.map((reply) => reply.id)
    },
    select: (data) => data.pages.flat(),
    staleTime: Infinity,
    gcTime: 1,
    ...options
  })

  const { error, data: replyIds } = queryRes

  useEffect(() => {
    if (error) {
      reportToSentry({
        error,
        name: 'Comments',
        feature: Feature.Comments
      })
      dispatch(toast({ content: messages.loadError('replies') }))
    }
  }, [error, dispatch, reportToSentry])

  const { data: replies } = useComments(replyIds)

  return {
    data: replies,
    isPending: queryRes.isPending,
    isLoading: queryRes.isLoading,
    isFetching: queryRes.isFetching
  }
}
