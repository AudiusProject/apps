import { expect, jest, test } from '@jest/globals'
import { Processor } from '../../main'
import * as sns from '../../sns'
import {
  setupTest,
  setupTwoUsersWithDevices,
  insertNotifications,
  resetTests
} from '../../utils/populateDB'

describe('Artist Remix Contest Submissions Notification', () => {
  let processor: Processor
  const sendPushNotificationSpy = jest
    .spyOn(sns, 'sendPushNotification')
    .mockImplementation(() => Promise.resolve({ endpointDisabled: false }))

  beforeEach(async () => {
    const setup = await setupTest()
    processor = setup.processor
  })

  afterEach(async () => {
    await resetTests(processor)
  })

  test('Sends push notification for first submission milestone', async () => {
    const { user1 } = await setupTwoUsersWithDevices(
      processor.discoveryDB,
      processor.identityDB
    )

    // Insert track for entityId 12345
    await processor.discoveryDB('tracks').insert({
      track_id: 12345,
      title: 'track_12345',
      owner_id: user1.userId,
      is_current: true,
      is_delete: false,
      created_at: new Date(),
      updated_at: new Date()
    })

    await insertNotifications(processor.discoveryDB, [
      {
        type: 'artist_remix_contest_submissions',
        user_ids: [user1.userId],
        group_id: 'test-group',
        specifier: 'test-specifier',
        timestamp: new Date(),
        data: { entityId: 12345, eventId: 999, milestone: 1 }
      }
    ])

    // Wait a short time for the notification to be enqueued
    await new Promise((resolve) => setTimeout(resolve, 10))
    const pending = processor.listener.takePending()
    expect(pending?.appNotifications).toBeDefined()
    expect(pending.appNotifications).toHaveLength(1)

    await processor.appNotificationsProcessor.process(pending.appNotifications)

    expect(sendPushNotificationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: user1.deviceType,
        targetARN: user1.awsARN,
        badgeCount: 1
      }),
      expect.objectContaining({
        title: 'New Remix Submission!',
        body: 'Your remix contest for track_12345 received its first submission!',
        data: expect.objectContaining({
          type: 'ArtistRemixContestSubmissions',
          entityId: 12345,
          eventId: 999,
          milestone: 1
        })
      })
    )
  })

  test('Sends push notification for later milestone', async () => {
    const { user1 } = await setupTwoUsersWithDevices(
      processor.discoveryDB,
      processor.identityDB
    )

    // Insert track for entityId 12345
    await processor.discoveryDB('tracks').insert({
      track_id: 12345,
      title: 'track_12345',
      owner_id: user1.userId,
      is_current: true,
      is_delete: false,
      created_at: new Date(),
      updated_at: new Date()
    })

    await insertNotifications(processor.discoveryDB, [
      {
        type: 'artist_remix_contest_submissions',
        user_ids: [user1.userId],
        group_id: 'test-group',
        specifier: 'test-specifier',
        timestamp: new Date(),
        data: { entityId: 12345, eventId: 999, milestone: 10 }
      }
    ])

    // Wait a short time for the notification to be enqueued
    await new Promise((resolve) => setTimeout(resolve, 10))
    const pending = processor.listener.takePending()
    expect(pending?.appNotifications).toBeDefined()
    expect(pending.appNotifications).toHaveLength(1)

    await processor.appNotificationsProcessor.process(pending.appNotifications)

    expect(sendPushNotificationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: user1.deviceType,
        targetARN: user1.awsARN,
        badgeCount: 1
      }),
      expect.objectContaining({
        title: 'New Remix Submission!',
        body: 'Your remix contest for track_12345 has received 10 submissions!',
        data: expect.objectContaining({
          type: 'ArtistRemixContestSubmissions',
          entityId: 12345,
          eventId: 999,
          milestone: 10
        })
      })
    )
  })
})
