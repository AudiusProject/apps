import {
  Comment as CommentSDK,
  OptionalHashId,
  ReplyComment as ReplyCommentSDK
} from '@audius/sdk/services'

import { Comment, ReplyComment } from '~/models/Comment'

import { transformAndCleanList } from './utils'

export const commentFromSDK = (input: CommentSDK): Comment | undefined => {
  const { id, userId, entityId, replies, ...rest } = input
  const decodedId = OptionalHashId.parse(id)
  const decodedEntityId = OptionalHashId.parse(entityId)
  const decodedUserId = OptionalHashId.parse(userId)

  if (!decodedId || !decodedEntityId) {
    return undefined
  }

  return {
    ...rest,
    id: decodedId,
    entityId: decodedEntityId,
    userId:
      userId === undefined || decodedUserId === null
        ? undefined
        : decodedUserId, // Note: comments can have no user id when they're a tombstone state (deleted but has replies)
    replies: transformAndCleanList(replies, replyCommentFromSDK)
  }
}

export const replyCommentFromSDK = (
  input: ReplyCommentSDK
): ReplyComment | undefined => {
  const { id, userId, entityId, ...rest } = input
  const decodedId = OptionalHashId.parse(id)
  const decodedUserId = OptionalHashId.parse(userId)
  const decodedEntityId = OptionalHashId.parse(entityId)

  if (!decodedId || !decodedUserId || !decodedEntityId) {
    return undefined
  }

  return {
    ...rest,
    id: decodedId,
    userId: decodedUserId,
    entityId: decodedEntityId
  }
}
