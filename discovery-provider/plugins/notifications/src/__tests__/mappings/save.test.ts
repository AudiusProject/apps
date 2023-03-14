import { expect, jest, test } from '@jest/globals'
import { Processor } from '../../main'
import * as sns from '../../sns'
import { getRedisConnection } from './../../utils/redisConnection'
import { config } from './../../config'

import {
  createUsers,
  insertMobileDevices,
  insertMobileSettings,
  createTestDB,
  dropTestDB,
  replaceDBName,
  createTracks,
  createPlaylists,
  createSaves,
} from '../../utils/populateDB'

import { AppEmailNotification } from '../../types/notifications'
import { renderEmail } from '../../email/notifications/renderEmail'
import { SaveType } from '../../types/dn'
import { EntityType } from '../../email/notifications/types'

describe('Save Notification', () => {
  let processor: Processor
  // Mock current date for test result consistency
  Date.now = jest.fn(() => new Date("2020-05-13T12:33:37.000Z").getTime())


  const sendPushNotificationSpy = jest.spyOn(sns, 'sendPushNotification')
    .mockImplementation(() => Promise.resolve())

  beforeEach(async () => {
    const testName = expect.getState().currentTestName.replace(/\s/g, '_').toLocaleLowerCase()
    await Promise.all([
      createTestDB(process.env.DN_DB_URL, testName),
      createTestDB(process.env.IDENTITY_DB_URL, testName)
    ])
    const redis = await getRedisConnection()
    redis.del(config.lastIndexedMessageRedisKey)
    redis.del(config.lastIndexedReactionRedisKey)
    processor = new Processor()
    await processor.init({
      identityDBUrl: replaceDBName(process.env.IDENTITY_DB_URL, testName),
      discoveryDBUrl: replaceDBName(process.env.DN_DB_URL, testName),
    })
  })

  afterEach(async () => {
    jest.clearAllMocks()
    await processor?.close()
    const testName = expect.getState().currentTestName.replace(/\s/g, '_').toLocaleLowerCase()
    await Promise.all([
      dropTestDB(process.env.DN_DB_URL, testName),
      dropTestDB(process.env.IDENTITY_DB_URL, testName),
    ])
  })

  test("Process push notification for save track", async () => {
    await createUsers(processor.discoveryDB, [{ user_id: 1 }, { user_id: 2 }])
    await createTracks(processor.discoveryDB, [{ track_id: 10, owner_id: 1 }])
    await createSaves(processor.discoveryDB, [{
      user_id: 2, save_item_id: 10, save_type: SaveType.track
    }])
    await insertMobileSettings(processor.identityDB, [{ userId: 1 }])
    await insertMobileDevices(processor.identityDB, [{ userId: 1 }])
    await new Promise(resolve => setTimeout(resolve, 10))
    const pending = processor.listener.takePending()
    expect(pending?.appNotifications).toHaveLength(1)
    // Assert single pending
    await processor.appNotificationsProcessor.process(pending.appNotifications)

    expect(sendPushNotificationSpy).toHaveBeenCalledWith({
      type: 'ios',
      targetARN: 'arn:1',
      badgeCount: 0
    }, {
      title: 'New Favorite',
      body: 'user_2 favorited your track track_title_10',
      data: {}
    })
  })

  test("Process push notification for save playlist", async () => {
    await createUsers(processor.discoveryDB, [{ user_id: 1 }, { user_id: 2 }])
    await createPlaylists(processor.discoveryDB, [{ playlist_id: 20, playlist_owner_id: 1, is_album: false }])
    await createSaves(processor.discoveryDB, [{
      user_id: 2, save_item_id: 20, save_type: SaveType.playlist
    }])
    await insertMobileSettings(processor.identityDB, [{ userId: 1 }])
    await insertMobileDevices(processor.identityDB, [{ userId: 1 }])
    await new Promise(resolve => setTimeout(resolve, 10))
    const pending = processor.listener.takePending()
    expect(pending?.appNotifications).toHaveLength(1)
    // Assert single pending
    await processor.appNotificationsProcessor.process(pending.appNotifications)

    expect(sendPushNotificationSpy).toHaveBeenCalledWith({
      type: 'ios',
      targetARN: 'arn:1',
      badgeCount: 0
    }, {
      title: 'New Favorite',
      body: 'user_2 favorited your playlist playlist_name_20',
      data: {}
    })
  })

  test("Process push notification for save album", async () => {
    await createUsers(processor.discoveryDB, [{ user_id: 1 }, { user_id: 2 }])
    await createPlaylists(processor.discoveryDB, [{ playlist_id: 30, playlist_owner_id: 1, is_album: true }])
    await createSaves(processor.discoveryDB, [{
      user_id: 2, save_item_id: 30, save_type: SaveType.playlist
    }])
    await insertMobileSettings(processor.identityDB, [{ userId: 1 }])
    await insertMobileDevices(processor.identityDB, [{ userId: 1 }])
    await new Promise(resolve => setTimeout(resolve, 10))
    const pending = processor.listener.takePending()
    expect(pending?.appNotifications).toHaveLength(1)
    // Assert single pending
    await processor.appNotificationsProcessor.process(pending.appNotifications)

    expect(sendPushNotificationSpy).toHaveBeenCalledWith({
      type: 'ios',
      targetARN: 'arn:1',
      badgeCount: 0
    }, {
      title: 'New Favorite',
      body: 'user_2 favorited your album playlist_name_30',
      data: {}
    })
  })

  test("Render a single email", async () => {
    await createUsers(processor.discoveryDB, [{ user_id: 1 }, { user_id: 2 }])
    await createTracks(processor.discoveryDB, [{ track_id: 10, owner_id: 1 }])
    await createSaves(processor.discoveryDB, [{
      user_id: 2, save_item_id: 10, save_type: SaveType.track
    }])

    await new Promise(resolve => setTimeout(resolve, 10))

    const notifications: AppEmailNotification[] = [
      {
        type: 'save',
        timestamp: new Date(),
        specifier: '2',
        group_id: 'save:10:type:track',
        data: {
          type: EntityType.Track,
          user_id: 2,
          save_item_id: 10
        },
        user_ids: [1],
        receiver_user_id: 1
      }
    ]
    const notifHtml = await renderEmail({
      userId: 1,
      email: 'joey@audius.co',
      frequency: 'daily',
      notifications,
      dnDb: processor.discoveryDB,
      identityDb: processor.identityDB
    })
    expect(notifHtml).toMatchSnapshot()
  })

  test("Render a multi save email", async () => {
    await createUsers(processor.discoveryDB, [{ user_id: 1 }, { user_id: 2 }, { user_id: 3 }, { user_id: 4 }, { user_id: 5 }])
    await createTracks(processor.discoveryDB, [{ track_id: 10, owner_id: 1 }])

    await createSaves(processor.discoveryDB, [
      { user_id: 2, save_item_id: 10, save_type: savetype.track },
      { user_id: 3, save_item_id: 10, save_type: savetype.track },
      { user_id: 4, save_item_id: 10, save_type: savetype.track },
      { user_id: 5, save_item_id: 10, save_type: savetype.track },
    ])

    const notifications: AppEmailNotification[] = Array.from(new Array(4), (_, num) => ({
      type: 'save',
      timestamp: new Date(),
      specifier: (num + 2).toString(),
      group_id: 'save:10:type:track',
      data: {
        type: EntityType.Track,
        user_id: (num + 2),
        save_item_id: 10
      },
      user_ids: [1],
      receiver_user_id: 1
    }))

    const notifHtml = await renderEmail({
      userId: 1,
      email: 'joey@audius.co',
      frequency: 'daily',
      notifications,
      dnDb: processor.discoveryDB,
      identityDb: processor.identityDB
    })
    expect(notifHtml).toMatchSnapshot()
  })
})
