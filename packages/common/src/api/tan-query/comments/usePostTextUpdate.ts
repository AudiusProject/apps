import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { Comment, Feature, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { getFanClubFeedQueryKey } from './useFanClubFeed'
import { getCommentQueryKey } from './utils'

export type PostTextUpdateArgs = {
  userId: ID
  entityId: ID // artist user_id (coin owner)
  body: string
  mint: string
  isMembersOnly?: boolean
}

export const usePostTextUpdate = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: PostTextUpdateArgs & { newId?: ID }) => {
      const sdk = await audiusSdk()
      return await sdk.comments.createComment({
        userId: Id.parse(args.userId)!,
        metadata: {
          commentId: args.newId,
          entityId: args.entityId,
          entityType: 'FanClub',
          body: args.body,
          mentions: [],
          isMembersOnly: args.isMembersOnly ?? true
        } as any
      })
    },
    onMutate: async (args: PostTextUpdateArgs & { newId?: ID }) => {
      const { userId, body, entityId, mint, isMembersOnly } = args
      const sdk = await audiusSdk()
      const newId = await sdk.comments.generateCommentId()
      args.newId = newId

      const newComment: Comment = {
        id: newId,
        entityId,
        entityType: 'FanClub',
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
        isMembersOnly: isMembersOnly ?? true
      }

      // Prime the individual comment cache
      queryClient.setQueryData(getCommentQueryKey(newId), newComment)

      // Optimistically prepend to the fan club feed
      const feedQueryKey = getFanClubFeedQueryKey({
        mint,
        sortMethod: 'newest'
      })
      queryClient.setQueryData(feedQueryKey, (prevData: any) => {
        if (!prevData) return prevData
        const newState = structuredClone(prevData)
        if (newState.pages?.[0]) {
          newState.pages[0].unshift({
            itemType: 'text_post' as const,
            commentId: newId
          })
        }
        return newState
      })

      return { newId }
    },
    onSuccess: (_data, args) => {
      // Invalidate the fan club feed to get fresh data from server
      queryClient.invalidateQueries({
        queryKey: getFanClubFeedQueryKey({
          mint: args.mint,
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
        content: 'There was an error posting your update. Please try again.'
      })
      // Invalidate to reset to server state
      queryClient.invalidateQueries({
        queryKey: getFanClubFeedQueryKey({
          mint: args.mint,
          sortMethod: 'newest'
        })
      })
    }
  })
}
