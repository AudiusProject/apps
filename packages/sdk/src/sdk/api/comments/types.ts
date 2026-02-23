import { z } from 'zod'

import type { EntityManagerService } from '../../services'
import { HashId } from '../../types/HashId'
import type { CommentEntityType } from '../generated/default'

export type CommentsApiServicesConfig = {
  entityManager?: EntityManagerService
}

export type CommentMetadata = {
  body?: string
  commentId?: number
  userId: number
  entityId: number
  entityType?: CommentEntityType // For now just tracks are supported, but we left the door open for more
  parentCommentId?: number
  trackTimestampS?: number
  mentions?: number[]
}

// Zod schemas for dual-auth support
export const CreateCommentSchema = z
  .object({
    userId: HashId,
    entityId: HashId,
    entityType: z.optional(z.string()),
    body: z.optional(z.string()),
    commentId: z.optional(z.number()),
    parentCommentId: z.optional(z.number()),
    trackTimestampS: z.optional(z.number()),
    mentions: z.optional(z.array(z.number()))
  })
  .strict()

export type EntityManagerCreateCommentRequest = z.input<
  typeof CreateCommentSchema
>

export const UpdateCommentSchema = z
  .object({
    userId: HashId,
    entityId: HashId,
    trackId: HashId,
    body: z.string()
  })
  .strict()

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
    trackId: HashId
  })
  .strict()

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
