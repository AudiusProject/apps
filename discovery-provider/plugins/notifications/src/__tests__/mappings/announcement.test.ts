import { expect, jest, test } from '@jest/globals'
import { Processor } from '../../main'
import * as sns from '../../sns'

import {
  createUsers,
  insertMobileDevices,
  insertMobileSettings,
  insertNotifications,
  setupTest,
  resetTests
} from '../../utils/populateDB'
import {
  AnnouncementNotification,
  AppEmailNotification
} from '../../types/notifications'
import { renderEmail } from '../../email/notifications/renderEmail'

describe('Announcement Notification', () => {
  let processor: Processor

  const sendPushNotificationSpy = jest
    .spyOn(sns, 'sendPushNotification')
    .mockImplementation(() => Promise.resolve())

  beforeEach(async () => {
    const setup = await setupTest()
    processor = setup.processor
    process.env.ANNOUNCEMENTS_DRY_RUN = "false"
    process.env.ANNOUNCEMENTS_EMAIL_ENABLED = "true"
  })

  afterEach(async () => {
    process.env.ANNOUNCEMENTS_DRY_RUN = "true"
    process.env.ANNOUNCEMENTS_EMAIL_ENABLED = "false"
    await resetTests(processor)
  })

  test('Process push notification for announcement', async () => {
    await createUsers(processor.discoveryDB, [{ user_id: 1 }, { user_id: 2 }])
    await insertMobileSettings(processor.identityDB, [
      { userId: 1 },
      { userId: 2 }
    ])
    await insertMobileDevices(processor.identityDB, [
      { userId: 1 },
      { userId: 2 }
    ])

    await insertNotifications(processor.discoveryDB, [
      {
        specifier: '',
        group_id: 'announcement:blocknumber:1',
        type: 'announcement',
        blocknumber: 2,
        timestamp: new Date(Date.now()),
        data: {
          title: 'This is an announcement',
          short_description:
            'This is some information about the announcement we need to display'
        },
        user_ids: [1, 2]
      }
    ])
    await new Promise((resolve) => setTimeout(resolve, 10))
    const pending = processor.listener.takePending()
    expect(pending?.appNotifications).toHaveLength(1)
    // Assert single pending
    await processor.appNotificationsProcessor.process(pending.appNotifications)

    expect(sendPushNotificationSpy).toHaveBeenCalledWith(
      {
        type: 'ios',
        targetARN: 'arn:1',
        badgeCount: 1
      },
      {
        title: 'This is an announcement',
        body: 'This is some information about the announcement we need to display',
        data: {
          id: 'timestamp:1589373217:group_id:announcement:blocknumber:1',
          type: 'Announcement'
        }
      }
    )
  })

  test('Render a single announcement email', async () => {
    const data: AnnouncementNotification = {
      title: 'This is an announcement',
      short_description:
        'This is some information about the announcement we need to display'
    }

    const notifications: AppEmailNotification[] = [
      {
        type: 'announcement',
        timestamp: new Date(),
        specifier: '1',
        group_id: 'announcement:blocknumber:1',
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
