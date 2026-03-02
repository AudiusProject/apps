import snakecaseKeys from 'snakecase-keys'

import { UninitializedEntityManagerError } from '../../errors'
import {
  Action,
  EntityManagerService,
  EntityType
} from '../../services/EntityManager/types'
import { decodeHashId, encodeHashId } from '../../utils/hashId'
import { parseParams } from '../../utils/parseParams'
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

import {
  CreateCommentSchema,
  UpdateCommentSchema,
  DeleteCommentSchema,
  PinCommentSchema,
  ReactCommentSchema,
  ReportCommentSchema,
  EntityManagerCreateCommentRequest,
  EntityManagerUpdateCommentRequest,
  EntityManagerDeleteCommentRequest,
  EntityManagerPinCommentRequest,
  EntityManagerReactCommentRequest,
  EntityManagerReportCommentRequest,
  type CommentsApiServicesConfig
} from './types'

export class CommentsApi extends GeneratedCommentsApi {
  private readonly entityManager?: EntityManagerService
  constructor(
    configuration: Configuration,
    services: CommentsApiServicesConfig
  ) {
    super(configuration)
    this.entityManager = services.entityManager
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
  async createCommentWithEntityManager(
    params: EntityManagerCreateCommentRequest
  ) {
    const metadata = await parseParams(
      'createComment',
      CreateCommentSchema
    )(params)
    const { userId, entityType = EntityType.TRACK, commentId } = metadata
    const newCommentId = commentId ?? (await this.generateCommentId())

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
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
    return encodeHashId(newCommentId)
  }

  override async createComment(
    params: CreateCommentRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      const { metadata, userId } = params
      const commentId = await this.createCommentWithEntityManager({
        userId,
        entityId: encodeHashId(metadata.entityId) ?? '',
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
  async updateCommentWithEntityManager(
    params: EntityManagerUpdateCommentRequest
  ) {
    const metadata = await parseParams(
      'updateComment',
      UpdateCommentSchema
    )(params)
    const { userId, entityId, trackId, body } = metadata
    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId,
      action: Action.UPDATE,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys({ body, entityId: trackId })
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
        userId,
        entityId: commentId,
        trackId: encodeHashId(metadata.entityId) ?? '',
        body: metadata.body
      })
    }
    return super.updateComment(params, requestInit)
  }

  /** @hidden
   * Delete a comment using entity manager
   */
  async deleteCommentWithEntityManager(
    params: EntityManagerDeleteCommentRequest
  ) {
    const metadata = await parseParams(
      'deleteComment',
      DeleteCommentSchema
    )(params)
    const { userId, entityId } = metadata
    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
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
      const metadata: EntityManagerDeleteCommentRequest = {
        userId: params.userId,
        entityId: params.commentId
      }
      return await this.deleteCommentWithEntityManager(metadata)
    }
    return super.deleteComment(params, requestInit)
  }

  /** @hidden
   * React to a comment using entity manager
   */
  async reactToCommentWithEntityManager(
    params: EntityManagerReactCommentRequest
  ) {
    const metadata = await parseParams(
      'reactComment',
      ReactCommentSchema
    )(params)
    const { userId, commentId, isLiked, trackId } = metadata
    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
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
      const metadata: EntityManagerReactCommentRequest = {
        userId: params.userId,
        commentId: params.commentId,
        isLiked: true,
        trackId: params.commentId // trackId represents the entity being commented on
      }
      return await this.reactToCommentWithEntityManager(metadata)
    }
    return super.reactToComment(params, requestInit)
  }

  override async unreactToComment(
    params: UnreactToCommentRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      const metadata: EntityManagerReactCommentRequest = {
        userId: params.userId,
        commentId: params.commentId,
        isLiked: false,
        trackId: params.commentId
      }
      return await this.reactToCommentWithEntityManager(metadata)
    }
    return super.unreactToComment(params, requestInit)
  }

  /** @hidden
   * Pin a comment using entity manager
   */
  async pinCommentWithEntityManager(params: EntityManagerPinCommentRequest) {
    const metadata = await parseParams('pinComment', PinCommentSchema)(params)
    const { userId, entityId, trackId, isPin } = metadata
    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
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
      const metadata: EntityManagerPinCommentRequest = {
        userId: params.userId,
        entityId: params.commentId,
        trackId: params.commentId, // trackId represents the entity being commented on
        isPin: true
      }
      return await this.pinCommentWithEntityManager(metadata)
    }
    return super.pinComment(params, requestInit)
  }

  override async unpinComment(
    params: UnpinCommentRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      const metadata: EntityManagerPinCommentRequest = {
        userId: params.userId,
        entityId: params.commentId,
        trackId: params.commentId,
        isPin: false
      }
      return await this.pinCommentWithEntityManager(metadata)
    }
    return super.unpinComment(params, requestInit)
  }

  /** @hidden
   * Report a comment using entity manager
   */
  async reportCommentWithEntityManager(
    params: EntityManagerReportCommentRequest
  ) {
    const metadata = await parseParams(
      'reportComment',
      ReportCommentSchema
    )(params)
    const { userId, entityId } = metadata
    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
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
      const metadata: EntityManagerReportCommentRequest = {
        userId: params.userId,
        entityId: params.commentId
      }
      return await this.reportCommentWithEntityManager(metadata)
    }
    return super.reportComment(params, requestInit)
  }

  /** @hidden
   * Mute/unmute a user (entity manager only)
   */
  async muteUser(userId: number, mutedUserId: number, isMuted: boolean) {
    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
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
  async updateCommentNotificationSetting(config: {
    userId: number
    entityType: EntityType
    entityId: number
    action: Action.MUTE | Action.UNMUTE
  }) {
    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    const response = await this.entityManager.manageEntity({
      ...config,
      metadata: ''
    })
    return response
  }
}
