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
      // Optimistic update our cache
      queryClient.setQueryData(
        getCommentQueryKey(commentId),
        (prevCommentState) =>
          ({
            ...prevCommentState,
            reactCount:
              (prevCommentState?.reactCount ?? 0) + (isLiked ? 1 : -1),
            isArtistReacted: isEntityOwner
              ? isLiked // If the artist is reacting, update the state accordingly
              : prevCommentState?.isArtistReacted, // otherwise, keep the previous state
            isCurrentUserReacted: isLiked
          }) as CommentOrReply
      )
      return { prevComment }
    },
    onError: (error: Error, args, context) => {
      const { commentId } = args
      console.error(error)
      // Toast standard error message
      dispatch(toast({ content: messages.mutationError('reacting to') }))

      // note: context could be undefined if the onMutate threw before returning
      if (context) {
        const { prevComment } = context
        // Revert our optimistic cache change
        queryClient.setQueryData(
          getCommentQueryKey(commentId),
          (prevData: CommentOrReply | undefined) =>
            ({
              ...prevData,
              // NOTE: intentionally only reverting the pieces we changed in case another mutation happened between this mutation start->error
              reactCount: prevComment?.reactCount,
              isArtistReacted: prevComment?.isArtistReacted,
              isCurrentUserReacted: prevComment?.isCurrentUserReacted
            }) as CommentOrReply
        )
      }
    }
  })
}
