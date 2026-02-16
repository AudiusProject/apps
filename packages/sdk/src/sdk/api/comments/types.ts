import type { CommentEntityType } from '../generated/default'

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
