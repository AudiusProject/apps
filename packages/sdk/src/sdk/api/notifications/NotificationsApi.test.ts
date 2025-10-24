import { describe, it, beforeAll, expect, vitest } from 'vitest'

import { createAppWalletClient } from '../../services/AudiusWalletClient'
import { EntityManagerClient } from '../../services/EntityManager'
import { Configuration } from '../generated/default'

import { NotificationsApi } from './NotificationsApi'

vitest.mock('../../services/EntityManager')
vitest.mock('../../services/StorageNodeSelector')
vitest.mock('../../services/Storage')
vitest.mock('./TrackUploadHelper')

vitest
  .spyOn(EntityManagerClient.prototype, 'manageEntity')
  .mockImplementation(async () => {
    return {
      blockHash: 'a',
      blockNumber: 1
    } as any
  })

describe('NotificationsApi', () => {
  let notifications: NotificationsApi

  beforeAll(() => {
    notifications = new NotificationsApi(
      new Configuration(),
      new EntityManagerClient({
        audiusWalletClient: createAppWalletClient({ apiKey: '' }),
        endpoint: 'https://discoveryprovider.audius.co'
      })
    )
    vitest.spyOn(console, 'warn').mockImplementation(() => {})
    vitest.spyOn(console, 'info').mockImplementation(() => {})
    vitest.spyOn(console, 'debug').mockImplementation(() => {})
    vitest.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('markAllNotificationsAsViewed', () => {
    it('marks all notifications as viewed if valid metadata is provided', async () => {
      const result = await notifications.markAllNotificationsAsViewed({
        userId: '7eP5n'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await notifications.markAllNotificationsAsViewed({
          userId: 5 as any
        })
      }).rejects.toThrow()
    })
  })

  describe('updatePlaylistLastViewedAt', () => {
    it('updates the playlist last viewed at if valid metadata is provided', async () => {
      const result = await notifications.updatePlaylistLastViewedAt({
        userId: '7eP5n',
        playlistId: 'x5pJ3Aj'
      })

      expect(result).toStrictEqual({
        blockHash: 'a',
        blockNumber: 1
      })
    })

    it('throws an error if invalid metadata is provided', async () => {
      await expect(async () => {
        await notifications.updatePlaylistLastViewedAt({
          userId: '7eP5n',
          playlistId: 1 as any
        })
      }).rejects.toThrow()
    })
  })
})
