import snakecaseKeys from 'snakecase-keys'
import { OverrideProperties } from 'type-fest'

import { LoggerService } from '../../services'
import {
  Action,
  EntityManagerService,
  EntityType,
  type ManageEntityOptions
} from '../../services/EntityManager/types'
import { HashId } from '../../types/HashId'
import { decodeHashId, encodeHashId } from '../../utils/hashId'
import {
  Configuration,
  CommentsApi as GeneratedCommentsApi,
  type CreateCommentRequest,
  type UpdateCommentRequest,
  type DeleteCommentRequest,
  type PinCommentRequest,
  type UnpinCommentRequest,
  type ReactToCommentRequest,
  type UnreactToCommentRequest,
  type ReportCommentRequest
} from '../generated/default'

import type { CommentMetadata } from './types'

type EditCommentMetadata = CommentMetadata & {
  trackId: number
}

type PinCommentMetadata = {
  userId: number
  entityId: number
  trackId: number
  isPin: boolean
}

type ReactCommentMetadata = {
  userId: number
  commentId: number
  isLiked: boolean
  trackId: number
}

type CommentNotificationOptions = OverrideProperties<
  Omit<ManageEntityOptions, 'metadata' | 'auth'>,
  { action: Action.MUTE | Action.UNMUTE }
>
export class CommentsApi extends GeneratedCommentsApi {
  constructor(
    configuration: Configuration,
    private readonly entityManager: EntityManagerService,
    private readonly logger: LoggerService
  ) {
    super(configuration)
  }

  async generateCommentId() {
    const response = await this.getUnclaimedCommentID()
    const { data: unclaimedId } = response
    if (!unclaimedId) {
      return Math.floor(Math.random() * 1000000)
    }
    return decodeHashId(unclaimedId)!
  }

  /** @hidden
   * Create a comment using entity manager
   */
  async createCommentWithEntityManager(metadata: CommentMetadata) {
    const { userId, entityType = EntityType.TRACK, commentId } = metadata
    const newCommentId = commentId ?? (await this.generateCommentId())
    await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId: newCommentId,
      action: Action.CREATE,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys({ entityType, ...metadata })
      })
    })
    this.logger.info('Successfully posted a comment')
    return encodeHashId(newCommentId)
  }

  override async createComment(
    params: CreateCommentRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      const { metadata, userId } = params
      const commentId = await this.createCommentWithEntityManager({
        userId: HashId.parse(userId),
        entityId: metadata.entityId,
        entityType: metadata.entityType,
        body: metadata.body,
        commentId: metadata.commentId,
        parentCommentId: metadata.parentId,
        trackTimestampS: metadata.trackTimestampS,
        mentions: metadata.mentions
      })
      return {
        success: true,
        commentId: commentId ?? undefined
      }
    }
    return super.createComment(params, requestInit)
  }

  /** @hidden
   * Update a comment using entity manager
   */
  async updateCommentWithEntityManager(metadata: EditCommentMetadata) {
    const { userId, entityId, trackId } = metadata
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId,
      action: Action.UPDATE,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys({ ...metadata, entityId: trackId })
      })
    })
    return response
  }

  override async updateComment(
    params: UpdateCommentRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      const { metadata, userId, commentId } = params
      return await this.updateCommentWithEntityManager({
        userId: HashId.parse(userId),
        entityId: HashId.parse(commentId),
        trackId: HashId.parse(commentId),
        body: metadata.body
      })
    }
    return super.updateComment(params, requestInit)
  }

  /** @hidden
   * Delete a comment using entity manager
   */
  async deleteCommentWithEntityManager(metadata: CommentMetadata) {
    const { userId, entityId } = metadata
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId,
      action: Action.DELETE,
      metadata: ''
    })
    return response
  }

  override async deleteComment(
    params: DeleteCommentRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.deleteCommentWithEntityManager({
        userId: HashId.parse(params.userId),
        entityId: HashId.parse(params.commentId)
      })
    }
    return super.deleteComment(params, requestInit)
  }

  /** @hidden
   * React to a comment using entity manager
   */
  async reactToCommentWithEntityManager(metadata: ReactCommentMetadata) {
    const { userId, commentId, isLiked, trackId } = metadata
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId: commentId,
      action: isLiked ? Action.REACT : Action.UNREACT,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys({ entityId: trackId, entityType: EntityType.TRACK })
      })
    })
    return response
  }

  override async reactToComment(
    params: ReactToCommentRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.reactToCommentWithEntityManager({
        userId: HashId.parse(params.userId),
        commentId: HashId.parse(params.commentId),
        isLiked: true,
        trackId: HashId.parse(params.commentId)
      })
    }
    return super.reactToComment(params, requestInit)
  }

  override async unreactToComment(
    params: UnreactToCommentRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.reactToCommentWithEntityManager({
        userId: HashId.parse(params.userId),
        commentId: HashId.parse(params.commentId),
        isLiked: true,
        trackId: HashId.parse(params.commentId)
      })
    }
    return super.unreactToComment(params, requestInit)
  }

  /** @hidden
   * Pin a comment using entity manager
   */
  async pinCommentWithEntityManager(metadata: PinCommentMetadata) {
    const { userId, entityId, trackId, isPin } = metadata
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId,
      action: isPin ? Action.PIN : Action.UNPIN,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys({ entityId: trackId })
      })
    })
    return response
  }

  override async pinComment(
    params: PinCommentRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.pinCommentWithEntityManager({
        userId: HashId.parse(params.userId),
        entityId: HashId.parse(params.commentId),
        trackId: HashId.parse(params.commentId),
        isPin: true
      })
    }
    return super.pinComment(params, requestInit)
  }

  override async unpinComment(
    params: UnpinCommentRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.pinCommentWithEntityManager({
        userId: HashId.parse(params.userId),
        entityId: HashId.parse(params.commentId),
        trackId: HashId.parse(params.commentId),
        isPin: false
      })
    }
    return super.unpinComment(params, requestInit)
  }

  /** @hidden
   * Report a comment using entity manager
   */
  async reportCommentWithEntityManager(userId: number, entityId: number) {
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId,
      action: Action.REPORT,
      metadata: ''
    })
    return response
  }

  override async reportComment(
    params: ReportCommentRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.reportCommentWithEntityManager(
        HashId.parse(params.userId),
        HashId.parse(params.commentId)
      )
    }
    return super.reportComment(params, requestInit)
  }

  /** @hidden
   * Mute/unmute a user (entity manager only)
   */
  async muteUser(userId: number, mutedUserId: number, isMuted: boolean) {
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: mutedUserId,
      action: isMuted ? Action.UNMUTE : Action.MUTE,
      metadata: ''
    })
    return response
  }

  /** @hidden
   * Update comment notification settings (entity manager only)
   */
  async updateCommentNotificationSetting(config: CommentNotificationOptions) {
    const response = await this.entityManager.manageEntity({
      ...config,
      metadata: ''
    })
    return response
  }
}
