import snakecaseKeys from 'snakecase-keys'

import { LoggerService } from '../../services'
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
  EntityManagerReportCommentRequest
} from './types'

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
  async createCommentWithEntityManager(
    params: EntityManagerCreateCommentRequest
  ) {
    const metadata = await parseParams(
      'createComment',
      CreateCommentSchema
    )(params)
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
      const { createCommentRequestBody, userId } = params
      const metadata: EntityManagerCreateCommentRequest = {
        userId,
        entityId: createCommentRequestBody.entityId,
        entityType: createCommentRequestBody.entityType,
        body: createCommentRequestBody.body,
        commentId: createCommentRequestBody.commentId,
        parentCommentId: createCommentRequestBody.parentId
      }
      const commentId = await this.createCommentWithEntityManager(metadata)
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
      const { updateCommentRequestBody, userId, commentId } = params
      const metadata: EntityManagerUpdateCommentRequest = {
        userId,
        entityId: commentId,
        trackId: commentId, // trackId is used for the entity being commented on
        body: updateCommentRequestBody.body
      }
      await this.updateCommentWithEntityManager(metadata)
      return {
        success: true
      }
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
      await this.deleteCommentWithEntityManager(metadata)
      return {
        success: true
      }
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
      await this.reactToCommentWithEntityManager(metadata)
      return {
        success: true
      }
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
      await this.reactToCommentWithEntityManager(metadata)
      return {
        success: true
      }
    }
    return super.unreactToComment(params, requestInit)
  }

  /** @hidden
   * Pin a comment using entity manager
   */
  async pinCommentWithEntityManager(params: EntityManagerPinCommentRequest) {
    const metadata = await parseParams('pinComment', PinCommentSchema)(params)
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
      const metadata: EntityManagerPinCommentRequest = {
        userId: params.userId,
        entityId: params.commentId,
        trackId: params.commentId, // trackId represents the entity being commented on
        isPin: true
      }
      await this.pinCommentWithEntityManager(metadata)
      return {
        success: true
      }
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
      await this.pinCommentWithEntityManager(metadata)
      return {
        success: true
      }
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
      await this.reportCommentWithEntityManager(metadata)
      return {
        success: true
      }
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
  async updateCommentNotificationSetting(config: {
    userId: number
    entityType: EntityType
    entityId: number
    action: Action.MUTE | Action.UNMUTE
  }) {
    const response = await this.entityManager.manageEntity({
      ...config,
      metadata: ''
    })
    return response
  }
}
