import { CommentMention, EntityType, Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cloneDeep } from 'lodash'

import { useQueryContext } from '~/api/tan-query/utils'
import { Comment, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { COMMENT_LIST_MUTATION_KEY } from './types'
import {
  addCommentCount,
  getCommentQueryKey,
  getTrackCommentListQueryKey,
  subtractCommentCount
} from './utils'

export type PostCommentArgs = {
  userId: ID
  trackId: ID
  entityType?: EntityType
  body: string
  currentSort: any
  parentCommentId?: ID
  trackTimestampS?: number
  mentions?: CommentMention[]
  newId?: ID
}

export const usePostComment = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: COMMENT_LIST_MUTATION_KEY,
    mutationFn: async (args: PostCommentArgs) => {
      const sdk = await audiusSdk()
      return await sdk.comments.createComment({
        userId: Id.parse(args.userId)!,
        metadata: {
          commentId: args.newId,
          entityId: args.trackId,
          entityType: 'Track',
          body: args.body,
          trackTimestampS: args.trackTimestampS,
          mentions: args.mentions?.map((mention) => mention.userId) ?? [],
          parentId: args.parentCommentId
        }
      })
    },
    onMutate: async (args: PostCommentArgs) => {
      const {
        userId,
        body,
        trackId,
        parentCommentId,
        trackTimestampS,
        currentSort,
        mentions
      } = args
      const isReply = parentCommentId !== undefined
      const sdk = await audiusSdk()
      const newId = await sdk.comments.generateCommentId()
      args.newId = newId
      const newComment: Comment = {
        id: newId,
        entityId: trackId,
        entityType: 'Track',
        userId,
        message: body,
        mentions,
        isEdited: false,
        trackTimestampS,
        reactCount: 0,
        replyCount: 0,
        replies: [],
        createdAt: new Date().toISOString(),
        updatedAt: undefined
      }
      if (isReply) {
        queryClient.setQueryData(
          getCommentQueryKey(parentCommentId),
          (comment) =>
            ({
              ...comment,
              replyCount: ((comment as Comment)?.replyCount ?? 0) + 1,
              replies: [...((comment as Comment)?.replies ?? []), newComment]
            }) as Comment
        )
      } else {
        queryClient.setQueryData(
          getTrackCommentListQueryKey({ trackId, sortMethod: currentSort }),
          (prevData) => {
            const newState = cloneDeep(prevData) ?? {
              pages: [[]],
              pageParams: [0]
            }

            newState.pages[0].unshift(newId)
            return newState
          }
        )
      }
      queryClient.setQueryData(getCommentQueryKey(newId), newComment)

      addCommentCount(queryClient, trackId)
    },
    onError: (error: Error, args) => {
      const { trackId, currentSort } = args
      console.error(error)
      subtractCommentCount(queryClient, trackId)
      toast({
        content: 'There was an error posting that comment. Please try again'
      })
      queryClient.resetQueries({
        queryKey: getTrackCommentListQueryKey({
          trackId,
          sortMethod: currentSort
        })
      })
    }
  })
}
