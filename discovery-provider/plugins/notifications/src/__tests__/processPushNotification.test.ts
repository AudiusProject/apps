import { expect, jest, test } from '@jest/globals'
import { Processor } from '../main'
import * as sns from '../sns'
import { config } from './../config'
import {
  randId,
  createChat,
  readChat,
  insertMessage,
  insertReaction,
  setupTwoUsersWithDevices,
  setupTest,
  resetTests,
  createTestDB,
  replaceDBName,
  dropTestDB
} from '../utils/populateDB'
import { getRedisConnection } from '../utils/redisConnection'

describe('Push Notifications', () => {
  let processor: Processor
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

    const redis = await getRedisConnection()
    redis.del(config.lastIndexedMessageRedisKey)
    redis.del(config.lastIndexedReactionRedisKey)
    processor = new Processor()

    // eslint-disable-next-line
    // @ts-ignore
    processor.server.app.listen = jest.fn((port: number, cb: () => void) =>
      cb()
    )

    await processor.init({
      identityDBUrl: replaceDBName(process.env.IDENTITY_DB_URL, testName),
      discoveryDBUrl: replaceDBName(process.env.DN_DB_URL, testName)
    })
  })

  afterEach(async () => {
    jest.clearAllMocks()
    processor.stop()
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

  test('Process DM for ios', async () => {
    const { user1, user2 } = await setupTwoUsersWithDevices(
      processor.discoveryDB,
      processor.identityDB
    )

    // Start processor
    processor.start()
    // Let notifications job run for a few cycles to initialize the min cursors in redis
    await new Promise((r) => setTimeout(r, config.pollInterval))

    // User 1 sent message config.dmNotificationDelay ms ago
    const message = 'hi from user 1'
    const messageId = randId().toString()
    const messageTimestampMs = Date.now() - config.dmNotificationDelay
    const messageTimestamp = new Date(messageTimestampMs)
    const chatId = randId().toString()
    await createChat(
      processor.discoveryDB,
      user1.userId,
      user2.userId,
      chatId,
      messageTimestamp
    )
    await insertMessage(
      processor.discoveryDB,
      user1.userId,
      chatId,
      messageId,
      message,
      messageTimestamp
    )

    await new Promise((r) => setTimeout(r, config.pollInterval * 4))

    expect(sendPushNotificationSpy).toHaveBeenCalledTimes(1)
    expect(sendPushNotificationSpy).toHaveBeenCalledWith(
      {
        type: user2.deviceType,
        targetARN: user2.awsARN,
        badgeCount: 1
      },
      {
        title: 'Message',
        body: `New message from ${user1.name}`,
        data: {}
      }
    )

    jest.clearAllMocks()

    // User 2 reacted to user 1's message config.dmNotificationDelay ms ago
    const reaction = 'fire'
    const reactionTimestampMs = Date.now() - config.dmNotificationDelay
    await insertReaction(
      processor.discoveryDB,
      user2.userId,
      messageId,
      reaction,
      new Date(reactionTimestampMs)
    )

    await new Promise((r) => setTimeout(r, config.pollInterval * 3))
    expect(sendPushNotificationSpy).toHaveBeenCalledTimes(1)
    expect(sendPushNotificationSpy).toHaveBeenCalledWith(
      {
        type: user1.deviceType,
        targetARN: user1.awsARN,
        badgeCount: 1
      },
      {
        title: 'Reaction',
        body: `${user2.name} reacted ${reaction} to your message`,
        data: {}
      }
    )
  })

  test('Does not send DM notifications when sender is receiver', async () => {
    const { user1, user2 } = await setupTwoUsersWithDevices(
      processor.discoveryDB,
      processor.identityDB
    )

    // Start processor
    processor.start()
    // Let notifications job run for a few cycles to initialize the min cursors in redis
    await new Promise((r) => setTimeout(r, config.pollInterval * 2))

    // User 1 sent message config.dmNotificationDelay ms ago
    const message = 'hi from user 1'
    const messageId = randId().toString()
    const messageTimestampMs = Date.now() - config.dmNotificationDelay
    const messageTimestamp = new Date(messageTimestampMs)
    const chatId = randId().toString()
    await createChat(
      processor.discoveryDB,
      user1.userId,
      user2.userId,
      chatId,
      messageTimestamp
    )
    await insertMessage(
      processor.discoveryDB,
      user1.userId,
      chatId,
      messageId,
      message,
      messageTimestamp
    )

    await new Promise((r) => setTimeout(r, config.pollInterval * 2))
    expect(sendPushNotificationSpy).toHaveBeenCalledTimes(1)
    expect(sendPushNotificationSpy).toHaveBeenCalledWith(
      {
        type: user2.deviceType,
        targetARN: user2.awsARN,
        badgeCount: 1
      },
      {
        title: 'Message',
        body: `New message from ${user1.name}`,
        data: {}
      }
    )

    jest.clearAllMocks()

    // User 1 reacted to user 1's message config.dmNotificationDelay ms ago
    const reaction = 'fire'
    const reactionTimestampMs = Date.now() - config.dmNotificationDelay
    await insertReaction(
      processor.discoveryDB,
      user1.userId,
      messageId,
      reaction,
      new Date(reactionTimestampMs)
    )

    await new Promise((r) => setTimeout(r, config.pollInterval * 2))
    expect(sendPushNotificationSpy).not.toHaveBeenCalled()
  })

  test('Does not send DM notifications created fewer than delay minutes ago', async () => {
    const { user1, user2 } = await setupTwoUsersWithDevices(
      processor.discoveryDB,
      processor.identityDB
    )

    // Start processor
    processor.start()
    // Let notifications job run for a few cycles to initialize the min cursors in redis
    await new Promise((r) => setTimeout(r, config.pollInterval * 2))

    // User 1 sends message now
    const message = 'hi from user 1'
    const messageId = randId().toString()
    const messageTimestamp = new Date(Date.now())
    const chatId = randId().toString()
    await createChat(
      processor.discoveryDB,
      user1.userId,
      user2.userId,
      chatId,
      messageTimestamp
    )
    await insertMessage(
      processor.discoveryDB,
      user1.userId,
      chatId,
      messageId,
      message,
      messageTimestamp
    )

    await new Promise((r) => setTimeout(r, config.pollInterval * 2))
    expect(sendPushNotificationSpy).not.toHaveBeenCalled
  })

  test('Does not send DM reaction notifications created fewer than delay minutes ago', async () => {
    const { user1, user2 } = await setupTwoUsersWithDevices(
      processor.discoveryDB,
      processor.identityDB
    )

    // Set up chat and message
    const message = 'hi from user 1'
    const messageId = randId().toString()
    const messageTimestamp = new Date(Date.now())
    const chatId = randId().toString()
    await createChat(
      processor.discoveryDB,
      user1.userId,
      user2.userId,
      chatId,
      messageTimestamp
    )
    await insertMessage(
      processor.discoveryDB,
      user1.userId,
      chatId,
      messageId,
      message,
      messageTimestamp
    )

    // Start processor
    processor.start()
    // Let notifications job run for a few cycles to initialize the min cursors in redis
    await new Promise((r) => setTimeout(r, config.pollInterval * 2))

    // User 2 reacts to user 1's message now
    const reaction = 'fire'
    await insertReaction(
      processor.discoveryDB,
      user2.userId,
      messageId,
      reaction,
      new Date(Date.now())
    )

    await new Promise((r) => setTimeout(r, config.pollInterval * 2))
    expect(sendPushNotificationSpy).not.toHaveBeenCalled
  })

  test('Does not send DM notifications for messages that have been read', async () => {
    const { user1, user2 } = await setupTwoUsersWithDevices(
      processor.discoveryDB,
      processor.identityDB
    )

    // Start processor
    processor.start()
    // Let notifications job run for a few cycles to initialize the min cursors in redis
    await new Promise((r) => setTimeout(r, config.pollInterval * 2))

    // User 1 sent message config.dmNotificationDelay ms ago
    const message = 'hi from user 1'
    const messageId = randId().toString()
    const messageTimestampMs = Date.now() - config.dmNotificationDelay
    const messageTimestamp = new Date(messageTimestampMs)
    const chatId = randId().toString()
    await createChat(
      processor.discoveryDB,
      user1.userId,
      user2.userId,
      chatId,
      messageTimestamp
    )
    await insertMessage(
      processor.discoveryDB,
      user1.userId,
      chatId,
      messageId,
      message,
      messageTimestamp
    )
    // User 2 reads chat
    await readChat(
      processor.discoveryDB,
      user2.userId,
      chatId,
      new Date(Date.now())
    )

    await new Promise((r) => setTimeout(r, config.pollInterval * 2))
    expect(sendPushNotificationSpy).not.toHaveBeenCalled

    jest.clearAllMocks()

    // User 2 reacted to user 1's message config.dmNotificationDelay ms ago
    const reaction = 'fire'
    const reactionTimestampMs = Date.now() - config.dmNotificationDelay
    await insertReaction(
      processor.discoveryDB,
      user2.userId,
      messageId,
      reaction,
      new Date(reactionTimestampMs)
    )

    // User 1 reads chat
    await readChat(
      processor.discoveryDB,
      user1.userId,
      chatId,
      new Date(Date.now())
    )

    await new Promise((r) => setTimeout(r, config.pollInterval * 2))
    expect(sendPushNotificationSpy).not.toHaveBeenCalled
  })
})
