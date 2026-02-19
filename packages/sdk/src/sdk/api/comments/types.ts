import { EntityType } from '../../services/EntityManager/types'

export type CommentMetadata = {
  body?: string
  commentId?: number
  userId: number
  entityId: number
  entityType?: EntityType // For now just tracks are supported, but we left the door open for more
  parentCommentId?: number
  trackTimestampS?: number
  mentions?: number[]
}
