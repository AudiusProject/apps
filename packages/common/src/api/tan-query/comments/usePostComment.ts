import { CommentMention, EntityType } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cloneDeep } from 'lodash'

import { useQueryContext } from '~/api/tan-query/utils'
import { Comment, Feature, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

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
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: PostCommentArgs) => {
      const sdk = await audiusSdk()
      return await sdk.comments.postComment({
        ...args,
        mentions: args.mentions?.map((mention) => mention.userId) ?? [],
        entityId: args.trackId,
        commentId: args.newId
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
      // This executes before the mutationFn is called, and the reference to comment is the same in both
      // therefore, this sets the id that will be posted to the server
      const sdk = await audiusSdk()
      const newId = await sdk.comments.generateCommentId()
      // hack alert: there is no way to send context from onMutate to mutationFn so we hack it into the args
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
        replies: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: undefined
      }
      // If a root comment, update the sort data
      if (isReply) {
        // Update the parent comment replies list
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
            // NOTE: The prevData here should never be undefined so the backup object should never be used
            // If it is undefined then the query key might be incorrect
            const newState = cloneDeep(prevData) ?? {
              pages: [[]],
              pageParams: [0]
            }

            newState.pages[0].unshift(newId)
            return newState
          }
        )
      }
      // Update the individual comment cache
      queryClient.setQueryData(getCommentQueryKey(newId), newComment)

      // Add to the comment count
      addCommentCount(queryClient, trackId)
    },
    onError: (error: Error, args) => {
      const { trackId, currentSort } = args
      reportToSentry({
        error,
        additionalInfo: args,
        name: 'Comments',
        feature: Feature.Comments
      })
      // Undo comment count change
      subtractCommentCount(queryClient, trackId)
      // Toast generic error message
      toast({
        content: 'There was an error posting that comment. Please try again'
      })
      // TODO: avoid hard reset here?
      queryClient.resetQueries({
        queryKey: getTrackCommentListQueryKey({
          trackId,
          sortMethod: currentSort
        })
      })
    }
  })
}
