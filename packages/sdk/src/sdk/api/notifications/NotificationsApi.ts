import type { Configuration } from '../../api/generated/default'
import type { NotificationsApi as NotificationsApiFull } from '../../api/generated/full'
import type { EntityManagerService } from '../../services'
import { Action, EntityType } from '../../services/EntityManager/types'
import { parseParams } from '../../utils/parseParams'

import {
  MarkAllNotificationsAsViewedRequest,
  UpdatePlaylistLastViewedAtRequest,
  MarkAllNotificationsAsViewedSchema,
  UpdatePlaylistLastViewedAtSchema
} from './types'

export class NotificationsApi {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    _config: Configuration,
    private readonly entityManager: EntityManagerService,
    private readonly notificationsApiFullDefaultPath?: NotificationsApiFull
  ) {}

  /** Get notifications for a user (delegates to full API with default basePath). */
  getNotifications(
    params: Parameters<NotificationsApiFull['getNotifications']>[0]
  ) {
    if (!this.notificationsApiFullDefaultPath)
      throw new Error('NotificationsApiFull (default path) not configured')
    return this.notificationsApiFullDefaultPath.getNotifications(params)
  }

  /** Get playlist updates for a user (delegates to full API with default basePath). */
  getPlaylistUpdates(
    params: Parameters<NotificationsApiFull['getPlaylistUpdates']>[0]
  ) {
    if (!this.notificationsApiFullDefaultPath)
      throw new Error('NotificationsApiFull (default path) not configured')
    return this.notificationsApiFullDefaultPath.getPlaylistUpdates(params)
  }

  /**
   * When a user views all of their notifications
   */
  async markAllNotificationsAsViewed(
    params: MarkAllNotificationsAsViewedRequest
  ) {
    const { userId } = await parseParams(
      'markAllNotificationsAsViewed',
      MarkAllNotificationsAsViewedSchema
    )(params)
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.NOTIFICATION,
      // In this case, we are the entityId since we are marking our own notifications as viewed
      entityId: userId,
      action: Action.VIEW,
      metadata: ''
    })
  }

  /**
   * When a user views a playlist
   */
  async updatePlaylistLastViewedAt(params: UpdatePlaylistLastViewedAtRequest) {
    const { playlistId, userId } = await parseParams(
      'updatePlaylistLastViewedAt',
      UpdatePlaylistLastViewedAtSchema
    )(params)
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.NOTIFICATION,
      entityId: playlistId,
      action: Action.VIEW_PLAYLIST,
      metadata: ''
    })
  }
}
