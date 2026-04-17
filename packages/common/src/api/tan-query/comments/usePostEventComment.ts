import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { Comment, Feature, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { getEventCommentsQueryKey } from './useEventComments'
import { getCommentQueryKey } from './utils'

export type PostEventCommentArgs = {
  userId: ID
  eventId: ID
  body: string
  parentCommentId?: ID
  mentions?: ID[]
}

/**
 * Post a comment on a remix-contest event. The same mutation serves both
 * "post updates" (when the author is the event owner) and regular user
 * comments — the indexer and UI both disambiguate by comparing user_id to
 * the event's owner, so there's no client-side branching here.
 */
export const usePostEventComment = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: PostEventCommentArgs & { newId?: ID }) => {
      const sdk = await audiusSdk()
      return await sdk.comments.createComment({
        userId: Id.parse(args.userId)!,
        metadata: {
          commentId: args.newId,
          entityId: args.eventId,
          entityType: 'Event',
          body: args.body,
          parentCommentId: args.parentCommentId,
          mentions: args.mentions ?? []
        } as any
      })
    },
    onMutate: async (args: PostEventCommentArgs & { newId?: ID }) => {
      const { userId, eventId, body } = args
      const sdk = await audiusSdk()
      const newId = await sdk.comments.generateCommentId()
      args.newId = newId

      const newComment: Comment = {
        id: newId,
        entityId: eventId,
        entityType: 'Event',
        userId,
        message: body,
        mentions: [],
        isEdited: false,
        trackTimestampS: undefined,
        reactCount: 0,
        replyCount: 0,
        replies: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: undefined,
        isMembersOnly: false
      } as unknown as Comment

      // Prime the individual comment cache
      queryClient.setQueryData(getCommentQueryKey(newId), newComment)

      // Only optimistically push top-level comments to the feed; replies are
      // nested inside their parent comment and come back on invalidation.
      if (!args.parentCommentId) {
        const feedQueryKey = getEventCommentsQueryKey({
          eventId,
          sortMethod: 'newest'
        })
        queryClient.setQueryData(feedQueryKey, (prevData: any) => {
          if (!prevData) return prevData
          const next = structuredClone(prevData)
          if (next.pages?.[0]) {
            next.pages[0].unshift({ commentId: newId })
          }
          return next
        })
      }

      return { newId }
    },
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({
        queryKey: getEventCommentsQueryKey({
          eventId: args.eventId,
          sortMethod: 'newest'
        })
      })
    },
    onError: (error: Error, args) => {
      reportToSentry({
        error,
        additionalInfo: args,
        name: 'Comments',
        feature: Feature.Comments
      })
      toast({
        content: 'There was an error posting your comment. Please try again.'
      })
      queryClient.invalidateQueries({
        queryKey: getEventCommentsQueryKey({
          eventId: args.eventId,
          sortMethod: 'newest'
        })
      })
    }
  })
}
