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
  /**
   * Optional video URL to attach to the comment. Only meaningful on
   * post-updates from the event owner today, but carried through on all
   * comments so the backend can surface the same affordance later.
   */
  videoUrl?: string
}

/**
 * Post a comment on a remix-contest event. The same mutation serves both
 * "post updates" (when the author is the event owner) and regular user
 * comments — the indexer and UI both disambiguate by comparing user_id to
 * the event's owner, so there's no client-side branching here.
 */
export const usePostEventComment = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: PostEventCommentArgs & { newId?: ID }) => {
      const sdk = await audiusSdk()
      // Note: SDK's CreateCommentRequestBody calls the parent field `parentId`
      // (not parentCommentId). The SDK's createComment override reads
      // `metadata.parentId` to build the on-chain payload. Sending it under
      // the wrong key drops the link silently — the indexer never gets a
      // parent_comment_id, no comment_threads row is created, and the
      // refetched reply comes back un-threaded which mis-routes artist
      // replies to the Updates feed.
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

      // Carry parentCommentId + videoUrl on the optimistic shape — without
      // them the row classifier in the Contest comments tile mis-routes
      // replies (no parentCommentId → looks like a host post-update) and
      // the attached video doesn't render until the refetch lands.
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

      // Prime the individual comment cache
      queryClient.setQueryData(getCommentQueryKey(newId), newComment)

      if (!parentCommentId) {
        // Top-level comment: prepend to every cached sort variant ('top' /
        // 'newest' / 'timestamp') so the comment shows up regardless of
        // which tab the user is viewing.
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
        // Reply: push into the parent's nested `replies` array so the
        // reply appears under the parent without waiting for the refetch.
        // Mirrors `usePostComment`'s optimistic behavior for tracks.
        // The cache slot is typed `CommentOrReply | undefined`. The
        // optimistic shape we splice in is a `Comment`-shaped object that
        // structurally satisfies `CommentOrReply` but TS can't prove it
        // (entityType narrows differently on the ReplyComment branch),
        // so we shape the updater as `(prev) => CommentOrReply` and
        // cast the result. The `as any` on `replyShape` is the same
        // escape hatch usePostComment uses for its optimistic reply.
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
    // No onSuccess invalidate: the optimistic comment was just primed with
    // the same id the SDK reserved, so the next natural refetch (focus /
    // remount / staleTime expiry) will replace it seamlessly once the
    // indexer has caught up. Invalidating immediately races the indexer —
    // the refetch returns the pre-comment list before the new row lands,
    // wiping the optimistic comment from the cache and giving the user the
    // "I pressed send and it disappeared" experience. Mirrors how the
    // track-comment hook (usePostComment) handles success.
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
