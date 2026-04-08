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
  type ReportCommentRequest,
  type CreateCommentRequestBody,
  type ReactCommentRequestBody,
  type UpdateCommentRequestBody
} from '../generated/default'
import {
  CommentFromJSON,
  TrackFromJSON,
  UserFromJSON
} from '../generated/default/models'
import * as runtime from '../generated/default/runtime'

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
  type CommentsApiServicesConfig,
  type FanClubFeedResponse
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
    const {
      userId,
      entityType = 'Track',
      commentId,
      body,
      mentions,
      parentCommentId,
      trackTimestampS,
      entityId,
      isMembersOnly,
      videoUrl
    } = metadata
    const newCommentId = commentId ?? (await this.generateCommentId())

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    const data: Record<string, unknown> = {
      entity_type: entityType === 'FanClub' ? 'FanClub' : 'Track',
      body,
      entity_id: entityId
    }
    if (isMembersOnly !== undefined) {
      data.is_members_only = isMembersOnly
    }
    if (mentions !== undefined && mentions.length > 0) {
      data.mentions = mentions
    }
    if (parentCommentId !== undefined) {
      data.parent_id = parentCommentId
      data.parent_comment_id = parentCommentId
    }
    if (trackTimestampS !== undefined) {
      data.track_timestamp_s = trackTimestampS
    }
    if (videoUrl !== undefined) {
      data.video_url = videoUrl
    }
    const res = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId: newCommentId,
      action: Action.CREATE,
      metadata: JSON.stringify({
        cid: '',
        data
      })
    })
    return {
      ...res,
      commentId: encodeHashId(newCommentId)!
    }
  }

  override async createComment(
    params: CreateCommentRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      const { metadata, userId } = params
      const md = metadata as CreateCommentRequestBody
      if (md.entityType === 'FanClub') {
        return await this.createCommentWithEntityManager({
          userId,
          entityType: 'FanClub',
          entityId: encodeHashId(metadata.entityId) ?? '',
          body: md.body,
          commentId: md.commentId,
          parentCommentId: md.parentId,
          trackTimestampS: md.trackTimestampS,
          mentions: md.mentions,
          isMembersOnly: (md as any).isMembersOnly,
          videoUrl: (md as any).videoUrl
        })
      }
      return await this.createCommentWithEntityManager({
        userId,
        entityId: encodeHashId(metadata.entityId) ?? '',
        entityType: 'Track',
        body: metadata.body,
        commentId: metadata.commentId,
        parentCommentId: metadata.parentId,
        trackTimestampS: metadata.trackTimestampS,
        mentions: metadata.mentions
      })
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
    const {
      userId,
      entityId,
      trackId,
      body,
      entityType = 'Track',
      mentions
    } = metadata
    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    const data: Record<string, unknown> = {
      entity_type: entityType === 'FanClub' ? 'FanClub' : 'Track',
      body,
      entity_id: trackId
    }
    if (mentions !== undefined && mentions.length > 0) {
      data.mentions = mentions
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId,
      action: Action.UPDATE,
      metadata: JSON.stringify({
        cid: '',
        data
      })
    })
  }

  override async updateComment(
    params: UpdateCommentRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      const { metadata, userId, commentId } = params
      const md = metadata as UpdateCommentRequestBody
      if (md.entityType === 'FanClub') {
        return await this.updateCommentWithEntityManager({
          userId,
          entityId: commentId,
          entityType: 'FanClub',
          trackId: encodeHashId(md.entityId) ?? '',
          body: md.body,
          mentions: md.mentions
        })
      }
      return await this.updateCommentWithEntityManager({
        userId,
        entityId: commentId,
        entityType: 'Track',
        trackId: encodeHashId(metadata.entityId) ?? '',
        body: metadata.body,
        mentions: md.mentions
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
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId,
      action: Action.DELETE,
      metadata: ''
    })
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
    const {
      userId,
      commentId,
      isLiked,
      trackId,
      entityType = 'Track'
    } = metadata
    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    const data: Record<string, unknown> = {
      entity_type: entityType === 'FanClub' ? 'FanClub' : 'Track',
      entity_id: trackId
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId: commentId,
      action: isLiked ? Action.REACT : Action.UNREACT,
      metadata: JSON.stringify({
        cid: '',
        data
      })
    })
  }

  override async reactToComment(
    params: ReactToCommentRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      const md = params.metadata as ReactCommentRequestBody
      const metadata: EntityManagerReactCommentRequest = {
        userId: params.userId,
        commentId: params.commentId,
        isLiked: true,
        entityType: md.entityType === 'FanClub' ? 'FanClub' : 'Track',
        trackId: encodeHashId(md.entityId) ?? ''
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
      const md = params.metadata as ReactCommentRequestBody
      const metadata: EntityManagerReactCommentRequest = {
        userId: params.userId,
        commentId: params.commentId,
        isLiked: false,
        entityType: md.entityType === 'FanClub' ? 'FanClub' : 'Track',
        trackId: encodeHashId(md.entityId) ?? ''
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
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId,
      action: isPin ? Action.PIN : Action.UNPIN,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys({ entityId: trackId })
      })
    })
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
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COMMENT,
      entityId,
      action: Action.REPORT,
      metadata: ''
    })
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
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: mutedUserId,
      action: isMuted ? Action.UNMUTE : Action.MUTE,
      metadata: ''
    })
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
    return await this.entityManager.manageEntity({
      ...config,
      metadata: ''
    })
  }

  /**
   * Fan-club feed: text posts (root `Coin` comments) + tracks stream-gated on this mint
   * (`stream_conditions.token_gate.token_mint`). API enforces holder gate.
   */
  async getFanClubFeed(
    params: {
      mint: string
      userId?: string
      limit?: number
      offset?: number
      sortMethod?: 'top' | 'newest' | 'timestamp'
    },
    initOverrides?: RequestInit | runtime.InitOverrideFunction
  ): Promise<FanClubFeedResponse> {
    const queryParameters: Record<string, string | number> = {
      mint: params.mint
    }
    if (params.offset !== undefined) {
      queryParameters.offset = params.offset
    }
    if (params.limit !== undefined) {
      queryParameters.limit = params.limit
    }
    if (params.userId !== undefined) {
      queryParameters.user_id = params.userId
    }
    if (params.sortMethod !== undefined) {
      queryParameters.sort_method = params.sortMethod
    }

    const headerParameters: runtime.HTTPHeaders = {}
    if (
      !headerParameters.Authorization &&
      this.configuration &&
      this.configuration.accessToken
    ) {
      const token = await this.configuration.accessToken('OAuth2', ['read'])
      if (token) {
        headerParameters.Authorization = token
      }
    }

    const response = await this.request(
      {
        path: '/fan_club/feed',
        method: 'GET',
        headers: headerParameters,
        query: queryParameters
      },
      initOverrides
    )

    return await new runtime.JSONApiResponse(
      response,
      (jsonValue): FanClubFeedResponse => {
        const o = jsonValue as Record<string, unknown>
        const rawData = (o.data as unknown[]) ?? []
        const data = rawData.map((item) => {
          const it = item as Record<string, unknown>
          if (it.item_type === 'text_post') {
            return {
              item_type: 'text_post' as const,
              comment: CommentFromJSON(it.comment)
            }
          }
          if (it.item_type === 'track') {
            return {
              item_type: 'track' as const,
              track: TrackFromJSON(it.track)
            }
          }
          return it as FanClubFeedResponse['data'][number]
        })
        const rel = (o.related as Record<string, unknown>) ?? {}
        return {
          data,
          related: {
            users: ((rel.users as unknown[]) ?? []).map((u) => UserFromJSON(u)),
            tracks: ((rel.tracks as unknown[]) ?? []).map((t) =>
              TrackFromJSON(t)
            )
          }
        }
      }
    ).value()
  }
}
