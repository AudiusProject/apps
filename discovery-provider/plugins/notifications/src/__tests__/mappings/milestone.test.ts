import { expect, jest, test } from '@jest/globals'
import { Processor } from '../../main'
import * as sns from '../../sns'

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
  insertFollows,
  createReposts
} from '../../utils/populateDB'

import { RepostType, SaveType } from '../../types/dn'
import {
  AppEmailNotification,
  FollowerMilestoneNotification,
  MilestoneType,
  PlaylistMilestoneNotification,
  TrackMilestoneNotification
} from '../../types/notifications'
import { renderEmail } from '../../email/notifications/renderEmail'

describe('Milestone Notification', () => {
  let processor: Processor
  // Mock current date for test result consistency
  Date.now = jest.fn(() => new Date('2020-05-13T12:33:37.000Z').getTime())

  const sendPushNotificationSpy = jest
    .spyOn(sns, 'sendPushNotification')
    .mockImplementation(() => Promise.resolve())

  beforeEach(async () => {
    const testName = expect
      .getState()
      .currentTestName.replace(/\s/g, '_')
      .toLocaleLowerCase()
    await Promise.all([
      createTestDB(process.env.DN_DB_URL, testName),
      createTestDB(process.env.IDENTITY_DB_URL, testName)
    ])
    processor = new Processor()
    await processor.init({
      identityDBUrl: replaceDBName(process.env.IDENTITY_DB_URL, testName),
      discoveryDBUrl: replaceDBName(process.env.DN_DB_URL, testName)
    })
  })

  afterEach(async () => {
    jest.clearAllMocks()
    await processor?.close()
    const testName = expect
      .getState()
      .currentTestName.replace(/\s/g, '_')
      .toLocaleLowerCase()
    await Promise.all([
      dropTestDB(process.env.DN_DB_URL, testName),
      dropTestDB(process.env.IDENTITY_DB_URL, testName)
    ])
  })

  test('Process push notification for follow count milestone', async () => {
    await createUsers(
      processor.discoveryDB,
      new Array(13).fill(null).map((_, ind) => ({ user_id: ind + 1 }))
    )
    await insertFollows(
      processor.discoveryDB,
      new Array(10)
        .fill(null)
        .map((_, ind) => ({ followee_user_id: 1, follower_user_id: ind + 2 }))
    )

    await insertMobileSettings(processor.identityDB, [{ userId: 1 }])
    await insertMobileDevices(processor.identityDB, [{ userId: 1 }])
    await new Promise((resolve) => setTimeout(resolve, 10))
    const pending = processor.listener.takePending()

    const milestoneNotifications = pending.appNotifications.filter(
      (n) => n.type === 'milestone' || n.type === 'milestone_follower_count'
    )
    expect(milestoneNotifications).toHaveLength(1)
    // Assert single pending

    await processor.appNotificationsProcessor.process(milestoneNotifications)

    expect(sendPushNotificationSpy).toHaveBeenCalledWith(
      {
        type: 'ios',
        targetARN: 'arn:1',
        badgeCount: 1
      },
      {
        title: 'Congratulations! 🎉',
        body: 'You have reached over 10 Followers',
        data: {}
      }
    )
  })

  test('Process email notification for follow count milestone', async () => {
    await createUsers(
      processor.discoveryDB,
      new Array(13).fill(null).map((_, ind) => ({ user_id: ind + 1 }))
    )
    await insertFollows(
      processor.discoveryDB,
      new Array(10)
        .fill(null)
        .map((_, ind) => ({ followee_user_id: 1, follower_user_id: ind + 2 }))
    )

    const data: FollowerMilestoneNotification = {
      type: MilestoneType.FOLLOWER_COUNT,
      user_id: 1,
      threshold: 10
    }

    const notifications: AppEmailNotification[] = [
      {
        type: 'milestone_follower_count',
        timestamp: new Date(),
        specifier: '1',
        group_id: 'milestone:FOLLOWER_COUNT:id:1:threshold:10',
        data,
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

  test('Process push notification for track repost milestone', async () => {
    await createUsers(
      processor.discoveryDB,
      new Array(13).fill(null).map((_, ind) => ({ user_id: ind + 1 }))
    )
    await createTracks(processor.discoveryDB, [{ track_id: 2, owner_id: 1 }])
    await createReposts(
      processor.discoveryDB,
      new Array(10).fill(null).map((_, ind) => ({
        repost_type: RepostType.track,
        repost_item_id: 2,
        user_id: ind + 2
      }))
    )

    await insertMobileSettings(processor.identityDB, [{ userId: 1 }])
    await insertMobileDevices(processor.identityDB, [{ userId: 1 }])
    await new Promise((resolve) => setTimeout(resolve, 10))
    const pending = processor.listener.takePending()

    const milestoneNotifications = pending.appNotifications.filter(
      (n) => n.type === 'milestone'
    )
    expect(milestoneNotifications).toHaveLength(1)
    // Assert single pending

    await processor.appNotificationsProcessor.process(milestoneNotifications)

    expect(sendPushNotificationSpy).toHaveBeenCalledWith(
      {
        type: 'ios',
        targetARN: 'arn:1',
        badgeCount: 1
      },
      {
        title: 'Congratulations! 🎉',
        body: 'Your track track_title_2 has reached over 10 reposts',
        data: {}
      }
    )
  })

  test('Process email notification for track repost milestone', async () => {
    await createUsers(
      processor.discoveryDB,
      new Array(63).fill(null).map((_, ind) => ({ user_id: ind + 1 }))
    )
    await createTracks(processor.discoveryDB, [{ track_id: 2, owner_id: 1 }])
    await createReposts(
      processor.discoveryDB,
      new Array(60).fill(null).map((_, ind) => ({
        repost_type: RepostType.track,
        repost_item_id: 2,
        user_id: ind + 2
      }))
    )

    const data: TrackMilestoneNotification = {
      type: MilestoneType.TRACK_REPOST_COUNT,
      track_id: 2,
      threshold: 50
    }

    const notifications: AppEmailNotification[] = [
      {
        type: 'milestone',
        timestamp: new Date(),
        specifier: '1',
        group_id: 'milestone:TRACK_REPOST_COUNT:id:2:threshold:10',
        data,
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

  test('Process push notification for playlist repost milestone', async () => {
    await createUsers(
      processor.discoveryDB,
      new Array(13).fill(null).map((_, ind) => ({ user_id: ind + 1 }))
    )
    await createPlaylists(processor.discoveryDB, [
      { playlist_id: 32, playlist_owner_id: 1 }
    ])
    await createReposts(
      processor.discoveryDB,
      new Array(10).fill(null).map((_, ind) => ({
        repost_type: RepostType.playlist,
        repost_item_id: 32,
        user_id: ind + 2
      }))
    )

    await insertMobileSettings(processor.identityDB, [{ userId: 1 }])
    await insertMobileDevices(processor.identityDB, [{ userId: 1 }])
    await new Promise((resolve) => setTimeout(resolve, 10))
    const pending = processor.listener.takePending()

    const milestoneNotifications = pending.appNotifications.filter(
      (n) => n.type === 'milestone'
    )
    expect(milestoneNotifications).toHaveLength(1)
    // Assert single pending

    await processor.appNotificationsProcessor.process(milestoneNotifications)

    expect(sendPushNotificationSpy).toHaveBeenCalledWith(
      {
        type: 'ios',
        targetARN: 'arn:1',
        badgeCount: 1
      },
      {
        title: 'Congratulations! 🎉',
        body: 'Your playlist playlist_name_32 has reached over 10 reposts',
        data: {}
      }
    )
  })

  test('Process email notification for playlist repost milestone', async () => {
    await createUsers(
      processor.discoveryDB,
      new Array(13).fill(null).map((_, ind) => ({ user_id: ind + 1 }))
    )
    await createPlaylists(processor.discoveryDB, [
      { playlist_id: 32, playlist_owner_id: 1 }
    ])
    await createReposts(
      processor.discoveryDB,
      new Array(10).fill(null).map((_, ind) => ({
        repost_type: RepostType.playlist,
        repost_item_id: 32,
        user_id: ind + 2
      }))
    )

    const data: PlaylistMilestoneNotification = {
      type: MilestoneType.PLAYLIST_REPOST_COUNT,
      playlist_id: 32,
      threshold: 10
    }

    const notifications: AppEmailNotification[] = [
      {
        type: 'milestone',
        timestamp: new Date(),
        specifier: '1',
        group_id: 'milestone:PLAYLIST_REPOST_COUNT:id:32:threshold:10',
        data,
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

  test('Process push notification for track save milestone', async () => {
    await createUsers(
      processor.discoveryDB,
      new Array(13).fill(null).map((_, ind) => ({ user_id: ind + 1 }))
    )
    await createTracks(processor.discoveryDB, [{ track_id: 2, owner_id: 1 }])
    await createSaves(
      processor.discoveryDB,
      new Array(10).fill(null).map((_, ind) => ({
        save_type: SaveType.track,
        save_item_id: 2,
        user_id: ind + 2
      }))
    )

    await insertMobileSettings(processor.identityDB, [{ userId: 1 }])
    await insertMobileDevices(processor.identityDB, [{ userId: 1 }])
    await new Promise((resolve) => setTimeout(resolve, 10))
    const pending = processor.listener.takePending()

    const milestoneNotifications = pending.appNotifications.filter(
      (n) => n.type === 'milestone'
    )
    expect(milestoneNotifications).toHaveLength(1)
    // Assert single pending

    await processor.appNotificationsProcessor.process(milestoneNotifications)

    expect(sendPushNotificationSpy).toHaveBeenCalledWith(
      {
        type: 'ios',
        targetARN: 'arn:1',
        badgeCount: 1
      },
      {
        title: 'Congratulations! 🎉',
        body: 'Your track track_title_2 has reached over 10 favorites',
        data: {}
      }
    )
  })

  test('Process email notification for track save milestone', async () => {
    await createUsers(
      processor.discoveryDB,
      new Array(53).fill(null).map((_, ind) => ({ user_id: ind + 1 }))
    )
    await createTracks(processor.discoveryDB, [{ track_id: 2, owner_id: 1 }])
    await createSaves(
      processor.discoveryDB,
      new Array(50).fill(null).map((_, ind) => ({
        save_type: SaveType.track,
        save_item_id: 2,
        user_id: ind + 2
      }))
    )

    const data: TrackMilestoneNotification = {
      type: MilestoneType.TRACK_SAVE_COUNT,
      track_id: 2,
      threshold: 50
    }

    const notifications: AppEmailNotification[] = [
      {
        type: 'milestone',
        timestamp: new Date(),
        specifier: '1',
        group_id: 'milestone:TRACK_SAVE_COUNT:id:2:threshold:10',
        data,
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

  test('Process push notification for playlist save milestone', async () => {
    await createUsers(
      processor.discoveryDB,
      new Array(13).fill(null).map((_, ind) => ({ user_id: ind + 1 }))
    )
    await createPlaylists(processor.discoveryDB, [
      { playlist_id: 32, playlist_owner_id: 1 }
    ])
    await createSaves(
      processor.discoveryDB,
      new Array(10).fill(null).map((_, ind) => ({
        save_type: SaveType.playlist,
        save_item_id: 32,
        user_id: ind + 2
      }))
    )

    await insertMobileSettings(processor.identityDB, [{ userId: 1 }])
    await insertMobileDevices(processor.identityDB, [{ userId: 1 }])
    await new Promise((resolve) => setTimeout(resolve, 10))
    const pending = processor.listener.takePending()

    const milestoneNotifications = pending.appNotifications.filter(
      (n) => n.type === 'milestone'
    )
    expect(milestoneNotifications).toHaveLength(1)
    // Assert single pending

    await processor.appNotificationsProcessor.process(milestoneNotifications)

    expect(sendPushNotificationSpy).toHaveBeenCalledWith(
      {
        type: 'ios',
        targetARN: 'arn:1',
        badgeCount: 1
      },
      {
        title: 'Congratulations! 🎉',
        body: 'Your playlist playlist_name_32 has reached over 10 favorites',
        data: {}
      }
    )
  })

  test('Process email notification for playlist save milestone', async () => {
    await createUsers(
      processor.discoveryDB,
      new Array(13).fill(null).map((_, ind) => ({ user_id: ind + 1 }))
    )
    await createPlaylists(processor.discoveryDB, [
      { playlist_id: 32, playlist_owner_id: 1 }
    ])
    await createSaves(
      processor.discoveryDB,
      new Array(10).fill(null).map((_, ind) => ({
        save_type: SaveType.playlist,
        save_item_id: 32,
        user_id: ind + 2
      }))
    )

    const data: PlaylistMilestoneNotification = {
      type: MilestoneType.PLAYLIST_SAVE_COUNT,
      playlist_id: 32,
      threshold: 10
    }

    const notifications: AppEmailNotification[] = [
      {
        type: 'milestone',
        timestamp: new Date(),
        specifier: '1',
        group_id: 'milestone:PLAYLIST_SAVE_COUNT:id:32:threshold:10',
        data,
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
})
