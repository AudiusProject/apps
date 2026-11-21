import type { TransactionReceipt } from 'web3-core'

import {
  Action,
  EntityType
} from '../services/dataContracts/EntityManagerClient'
import type { GetUserNotificationsParams } from '../services/discoveryProvider/requests'

import { Base, BaseConstructorArgs, Services } from './base'

type AnnouncementData = {}

export class Notifications extends Base {
  constructor(...args: BaseConstructorArgs) {
    super(...args)
    this.viewNotification = this.viewNotification.bind(this)
    this.createNotification = this.createNotification.bind(this)
    this.viewPlaylist = this.viewPlaylist.bind(this)
  }

  async viewNotification({
    logger = console,
    userId
  }: {
    userId?: number
    logger?: any
  }): Promise<{ txReceipt?: TransactionReceipt; error?: string }> {
    try {
      if (!userId) {
        return { error: 'Missing current user ID' }
      }

      const { txReceipt } =
        await this.contracts.EntityManagerClient!.manageEntity(
          userId,
          EntityType.NOTIFICATION,
          userId,
          Action.VIEW,
          ''
        )
      return { txReceipt }
    } catch (e) {
      const errorMessage = (e as Error).message
      logger.error(
        `Could not successfully submit view notification action to entity manager. Error: ${errorMessage}`
      )
      return { error: errorMessage }
    }
  }

  async createNotification({
    logger = console,
    data
  }: {
    logger: any
    data: AnnouncementData
  }): Promise<{ txReceipt?: TransactionReceipt; error?: string }> {
    try {
      const { txReceipt } =
        await this.contracts.EntityManagerClient!.manageEntity(
          1, // NOTE: This field does not matter
          EntityType.NOTIFICATION,
          1, // NOTE: This field does not matter
          Action.CREATE,
          JSON.stringify(data)
        )
      return { txReceipt }
    } catch (e) {
      const errorMessage = (e as Error).message
      logger.error(
        `Could not successfully submit create notification action to entity manager. Error: ${errorMessage}`
      )
      return { error: errorMessage }
    }
  }

  async viewPlaylist({
    logger = console,
    playlistId,
    userId
  }: {
    userId?: number
    logger: any
    playlistId: number
  }): Promise<{ txReceipt?: TransactionReceipt; error?: string }> {
    try {
      if (!userId) {
        return { error: 'Missing current user ID' }
      }
      if (!playlistId) {
        return { error: 'Missing playlist ID' }
      }

      const { txReceipt } =
        await this.contracts.EntityManagerClient!.manageEntity(
          userId,
          EntityType.NOTIFICATION,
          playlistId,
          Action.VIEW_PLAYLIST,
          ''
        )
      return { txReceipt }
    } catch (e) {
      const errorMessage = (e as Error).message
      logger.error(
        `Could not successfully submit view playlist action to entity manager. Error: ${errorMessage}`
      )
      return { error: errorMessage }
    }
  }

  async getNotifications(params: GetUserNotificationsParams): Promise<any> {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getUserNotifications(params)
  }
}
