import { z } from 'zod'

import type { EntityManagerService } from '../../services'
import { HashId } from '../../types/HashId'
import type { CommentEntityType } from '../generated/default'
import type { Comment } from '../generated/default/models/Comment'
import type { Track } from '../generated/default/models/Track'
import type { User } from '../generated/default/models/User'

export type CommentsApiServicesConfig = {
  entityManager?: EntityManagerService
}

/** Fan-club feed item: root coin-thread comment (text post) or artist track. */
export type FanClubFeedTextPostItem = {
  item_type: 'text_post'
  comment: Comment
}

export type FanClubFeedTrackItem = {
  item_type: 'track'
  track: Track
}

export type FanClubFeedItem = FanClubFeedTextPostItem | FanClubFeedTrackItem

export type FanClubFeedResponse = {
  data: FanClubFeedItem[]
  related: {
    users: User[]
    tracks: Track[]
  }
}

export type CommentMetadata = {
  body?: string
  commentId?: number
  userId: number
  entityId?: number
  entityType?: CommentEntityType
  parentCommentId?: number
  trackTimestampS?: number
  mentions?: number[]
}

// Zod schemas for dual-auth support
export const CreateCommentSchema = z
  .object({
    userId: HashId,
    entityId: z.optional(HashId),
    entityType: z.optional(z.enum(['Track', 'FanClub'])),
    body: z.optional(z.string()),
    commentId: z.optional(z.number()),
    parentCommentId: z.optional(z.number()),
    trackTimestampS: z.optional(z.number()),
    mentions: z.optional(z.array(z.number()))
  })
  .strict()
  .refine(
    (data) => {
      return data.entityId !== undefined
    },
    {
      message: 'Comments require entityId'
    }
  )

export type EntityManagerCreateCommentRequest = z.input<
  typeof CreateCommentSchema
>

export const UpdateCommentSchema = z
  .object({
    userId: HashId,
    entityId: HashId,
    trackId: z.optional(HashId),
    entityType: z.optional(z.enum(['Track', 'FanClub'])),
    body: z.string(),
    mentions: z.optional(z.array(z.number()))
  })
  .strict()
  .refine(
    (data) => {
      return data.trackId !== undefined
    },
    {
      message: 'Comment updates require trackId'
    }
  )

export type EntityManagerUpdateCommentRequest = z.input<
  typeof UpdateCommentSchema
>

export const DeleteCommentSchema = z
  .object({
    userId: HashId,
    entityId: HashId
  })
  .strict()

export type EntityManagerDeleteCommentRequest = z.input<
  typeof DeleteCommentSchema
>

export const PinCommentSchema = z
  .object({
    userId: HashId,
    entityId: HashId,
    trackId: HashId,
    isPin: z.boolean()
  })
  .strict()

export type EntityManagerPinCommentRequest = z.input<typeof PinCommentSchema>

export const ReactCommentSchema = z
  .object({
    userId: HashId,
    commentId: HashId,
    isLiked: z.boolean(),
    trackId: z.optional(HashId),
    entityType: z.optional(z.enum(['Track', 'FanClub']))
  })
  .strict()
  .refine(
    (data) => {
      return data.trackId !== undefined
    },
    {
      message: 'Reactions require trackId'
    }
  )

export type EntityManagerReactCommentRequest = z.input<
  typeof ReactCommentSchema
>

export const ReportCommentSchema = z
  .object({
    userId: HashId,
    entityId: HashId
  })
  .strict()

export type EntityManagerReportCommentRequest = z.input<
  typeof ReportCommentSchema
>
