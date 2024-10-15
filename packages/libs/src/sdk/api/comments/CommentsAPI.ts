import snakecaseKeys from 'snakecase-keys'
import { OverrideProperties } from 'type-fest'

import { AuthService, LoggerService } from '../../services'
import {
  Action,
  EntityManagerService,
  EntityType,
  ManageEntityOptions
} from '../../services/EntityManager/types'
import { decodeHashId, encodeHashId } from '../../utils/hashId'
import {
  Configuration,
  CommentsApi as GeneratedCommentsApi
} from '../generated/default'

import { CommentMetadata } from './types'

type PinCommentMetadata = {
  userId: number
  entityId: number
  trackId: number
  isPin: boolean
}

type CommentNotificationOptions = OverrideProperties<
  Omit<ManageEntityOptions, 'metadata' | 'auth'>,
  { action: Action.MUTE | Action.UNMUTE }
>

export class CommentsApi extends GeneratedCommentsApi {
  constructor(
    configuration: Configuration,
    private readonly entityManager: EntityManagerService,
    private readonly auth: AuthService,
    private readonly logger: LoggerService
  ) {
    super(configuration)
  }

  private async generateCommentId() {
    const response = await this.getUnclaimedCommentID()
    const { data: unclaimedId } = response
    if (!unclaimedId) {
      return Math.floor(Math.random() * 1000000)
    }
    return decodeHashId(unclaimedId)!
  }

  async postComment(metadata: CommentMetadata) {
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
      }),
      auth: this.auth
    })
    this.logger.info('Successfully posted a comment')
    return encodeHashId(newCommentId)
  }

  async editComment(metadata: CommentMetadata) {
    const { userId, entityId } = metadata
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId,
      action: Action.UPDATE,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys(metadata)
      }),
      auth: this.auth
    })
    return response
  }

  async deleteComment(metadata: CommentMetadata) {
    const { userId, entityId } = metadata
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId,
      action: Action.DELETE,
      metadata: '',
      auth: this.auth
    })
    return response
  }

  async reactComment(userId: number, entityId: number, isLiked: boolean) {
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId,
      action: isLiked ? Action.REACT : Action.UNREACT,
      metadata: '',
      auth: this.auth
    })
    return response
  }

  async pinComment(metadata: PinCommentMetadata) {
    const { userId, entityId, trackId, isPin } = metadata
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId,
      action: isPin ? Action.PIN : Action.UNPIN,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys({ entityId: trackId })
      }),
      auth: this.auth
    })
    return response
  }

  async reportComment(userId: number, entityId: number) {
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId,
      action: Action.REPORT,
      metadata: '',
      auth: this.auth
    })
    return response
  }

  async muteUser(userId: number, mutedUserId: number, isMuted: boolean) {
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: mutedUserId,
      action: isMuted ? Action.UNMUTE : Action.MUTE,
      metadata: '',
      auth: this.auth
    })
    return response
  }

  async updateCommentNotificationSetting(config: CommentNotificationOptions) {
    const response = await this.entityManager.manageEntity({
      ...config,
      metadata: '',
      auth: this.auth
    })
    return response
  }
}
