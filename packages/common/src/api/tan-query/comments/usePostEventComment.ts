import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { Comment, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { QUERY_KEYS } from '../queryKeys'

import { CommentOrReply } from './types'
import { getCommentQueryKey } from './utils'

export type PostEventCommentArgs = {
  userId: ID
  eventId: ID
  body: string
  parentCommentId?: ID
  mentions?: ID[]
  videoUrl?: string
}

export const usePostEventComment = () => {
  const { audiusSdk } = useQueryContext()
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
          parentId: args.parentCommentId,
          mentions: args.mentions ?? [],
          videoUrl: args.videoUrl
        } as any
      })
    },
    onMutate: async (args: PostEventCommentArgs & { newId?: ID }) => {
      const { userId, eventId, body, parentCommentId, videoUrl } = args
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
        isMembersOnly: false,
        parentCommentId,
        videoUrl
      } as unknown as Comment

      queryClient.setQueryData(getCommentQueryKey(newId), newComment)

      if (!parentCommentId) {
        queryClient.setQueriesData<any>(
          { queryKey: [QUERY_KEYS.eventComments, eventId] },
          (prevData: any) => {
            if (!prevData) return prevData
            const next = structuredClone(prevData)
            if (next.pages?.[0]) {
              next.pages[0].unshift({ commentId: newId })
            }
            return next
          }
        )
      } else {
        queryClient.setQueryData<CommentOrReply | undefined>(
          getCommentQueryKey(parentCommentId),
          (prev: CommentOrReply | undefined) => {
            if (!prev) return prev
            const parent = prev as Comment
            const replyShape = {
              id: newId,
              entityId: eventId,
              userId,
              message: body,
              mentions: [],
              isEdited: false,
              trackTimestampS: undefined,
              reactCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: undefined,
              isMembersOnly: false
            } as any
            return {
              ...parent,
              replies: [...(parent.replies ?? []), replyShape],
              replyCount: (parent.replyCount ?? 0) + 1
            } as CommentOrReply
          }
        )
      }

      return { newId }
    },
    onError: (error: Error, args) => {
      console.error(error)
      toast({
        content: 'There was an error posting your comment. Please try again.'
      })
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.eventComments, args.eventId]
      })
    }
  })
}
