import {
  CommentEntityType,
  Id,
  type ReactCommentRequestBody
} from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { CommentOrReply, messages } from './types'
import { getCommentQueryKey } from './utils'

export type ReactToCommentArgs = {
  commentId: ID
  userId: ID
  isLiked: boolean
  currentSort: any
  trackId: ID
  isEntityOwner?: boolean
  entityType?: CommentEntityType
}

export const useReactToComment = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  return useMutation({
    mutationFn: async ({
      userId,
      commentId,
      isLiked,
      trackId,
      entityType = CommentEntityType.Track
    }: ReactToCommentArgs) => {
      const sdk = await audiusSdk()
      const metadata: ReactCommentRequestBody = {
        entityId: trackId,
        entityType
      }
      if (isLiked) {
        await sdk.comments.reactToComment({
          userId: Id.parse(userId)!,
          commentId: Id.parse(commentId)!,
          metadata
        })
      } else {
        await sdk.comments.unreactToComment({
          userId: Id.parse(userId)!,
          commentId: Id.parse(commentId)!,
          metadata
        })
      }
    },
    mutationKey: ['reactToComment'],
    onMutate: async ({
      commentId,
      isLiked,
      isEntityOwner
    }: ReactToCommentArgs) => {
      const prevComment = queryClient.getQueryData(
        getCommentQueryKey(commentId)
      )
      queryClient.setQueryData(
        getCommentQueryKey(commentId),
        (prevCommentState) =>
          ({
            ...prevCommentState,
            reactCount:
              (prevCommentState?.reactCount ?? 0) + (isLiked ? 1 : -1),
            isArtistReacted: isEntityOwner
              ? isLiked
              : prevCommentState?.isArtistReacted, // otherwise, keep the previous state
            isCurrentUserReacted: isLiked
          }) as CommentOrReply
      )
      return { prevComment }
    },
    onError: (error: Error, args, context) => {
      const { commentId } = args
      console.error(error)
      dispatch(toast({ content: messages.mutationError('reacting to') }))

      if (context) {
        const { prevComment } = context
        queryClient.setQueryData(
          getCommentQueryKey(commentId),
          (prevData: CommentOrReply | undefined) =>
            ({
              ...prevData,
              reactCount: prevComment?.reactCount,
              isArtistReacted: prevComment?.isArtistReacted,
              isCurrentUserReacted: prevComment?.isCurrentUserReacted
            }) as CommentOrReply
        )
      }
    }
  })
}
