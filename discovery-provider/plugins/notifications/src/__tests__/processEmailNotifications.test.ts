import { expect, jest, test } from '@jest/globals';
import moment from 'moment-timezone'
import { Knex } from 'knex'

import { DMEntityType } from '../email/notifications/types'
import { enum_NotificationEmails_emailFrequency } from '../types/identity'
import { config } from '../config'
import { getDB } from '../conn'
import * as sendEmail from '../email/notifications/sendEmail'
import { processEmailNotifications } from '../email/notifications/index'
import { createTestDB, dropTestDB, replaceDBName, randId, createUsers, createChat, readChat, insertMessage, insertReaction, insertNotifications, insertNotificationEmails, setUserEmailAndSettings } from '../utils/populateDB';

describe('Email Notifications', () => {
  let discoveryDB: Knex
  let identityDB: Knex
  const sendNotificationEmailSpy = jest.spyOn(sendEmail, 'sendNotificationEmail')
    .mockImplementation(() => Promise.resolve(true))

  beforeEach(async () => {
    const testName = expect.getState().currentTestName.replace(/\s/g, '_').toLocaleLowerCase()
    await Promise.all([
      createTestDB(process.env.DN_DB_URL, testName),
      createTestDB(process.env.IDENTITY_DB_URL, testName)
    ])
    const discoveryDBUrl = replaceDBName(process.env.DN_DB_URL, testName)
    const identityDBUrl = replaceDBName(process.env.IDENTITY_DB_URL, testName)
    discoveryDB = await getDB(discoveryDBUrl)
    identityDB = await getDB(identityDBUrl)
  })

  afterEach(async () => {
    jest.clearAllMocks()
    await discoveryDB.destroy()
    await identityDB.destroy()
    const testName = expect.getState().currentTestName.replace(/\s/g, '_').toLocaleLowerCase()
    await Promise.all([
      dropTestDB(process.env.DN_DB_URL, testName),
      dropTestDB(process.env.IDENTITY_DB_URL, testName),
    ])
  })

  test("Process unread message", async () => {
    // Setup users and settings
    const user1 = 1
    const user2 = 2
    const userFrequency = 'live'
    const emailFrequency = 'daily'
    await createUsers(discoveryDB, [{ user_id: user1 }, { user_id: user2 }])
    const { email: user2Email } = await setUserEmailAndSettings(identityDB, userFrequency, user2)

    // User 1 sent message config.dmNotificationDelay mins ago
    const message = "hi from user 1"
    const messageId = randId().toString()
    const messageTimestamp = new Date(Date.now() - config.dmNotificationDelay)
    const chatId = randId().toString()
    await createChat(discoveryDB, user1, user2, chatId, messageTimestamp)
    await insertMessage(discoveryDB, user1, chatId, messageId, message, messageTimestamp)

    const expectedNotifications = [{
      type: DMEntityType.Message,
      sender_user_id: user1,
      receiver_user_id: user2
    }]
    await processEmailNotifications(discoveryDB, identityDB, emailFrequency)
    expect(sendNotificationEmailSpy).toHaveBeenCalledTimes(1)
    expect(sendNotificationEmailSpy).toHaveBeenCalledWith({
      userId: user2,
      email: user2Email,
      frequency: emailFrequency,
      notifications: expectedNotifications,
      dnDb: discoveryDB,
      identityDb: identityDB
    })
  })

  test("Process unread reaction", async () => {
    // Setup users and settings
    const user1 = 1
    const user2 = 2
    const userFrequency = 'live'
    const emailFrequency = 'daily'
    await createUsers(discoveryDB, [{ user_id: user1 }, { user_id: user2 }])
    const { email: user1Email } = await setUserEmailAndSettings(identityDB, userFrequency, user1)
    await setUserEmailAndSettings(identityDB, userFrequency, user2)

    // User 1 sent message config.dmNotificationDelay ms ago
    const message = "hi from user 1"
    const messageId = randId().toString()
    const messageTimestamp = new Date(Date.now() - config.dmNotificationDelay)
    const chatId = randId().toString()
    await createChat(discoveryDB, user1, user2, chatId, messageTimestamp)
    await insertMessage(discoveryDB, user1, chatId, messageId, message, messageTimestamp)

    // User 2 read chat config.dmNotificationDelay ms ago
    const reactionTimestamp = new Date(Date.now() - config.dmNotificationDelay)
    await readChat(discoveryDB, user2, chatId, reactionTimestamp)

    // User 2 reacted to user 1's message config.dmNotificationDelay ms ago
    const reaction = "heart"
    await insertReaction(discoveryDB, user2, messageId, reaction, reactionTimestamp)

    const expectedNotifications = [{
      type: DMEntityType.Reaction,
      sender_user_id: user2,
      receiver_user_id: user1
    }]
    await processEmailNotifications(discoveryDB, identityDB, emailFrequency)
    // No message notification because user 2 read the chat
    expect(sendNotificationEmailSpy).toHaveBeenCalledTimes(1)
    expect(sendNotificationEmailSpy).toHaveBeenCalledWith({
      userId: user1,
      email: user1Email,
      frequency: emailFrequency,
      notifications: expectedNotifications,
      dnDb: discoveryDB,
      identityDb: identityDB
    })
  })

  test("Process multiple unread messages", async () => {
    // Setup users and settings
    const user1 = 1
    const user2 = 2
    const userFrequency = 'live'
    const emailFrequency = 'daily'
    await createUsers(discoveryDB, [{ user_id: user1 }, { user_id: user2 }])
    const { email: user1Email } = await setUserEmailAndSettings(identityDB, userFrequency, user1)
    const { email: user2Email } = await setUserEmailAndSettings(identityDB, userFrequency, user2)

    // User 1 sent two messages config.dmNotificationDelay ms ago
    const message1 = "hi from user 1"
    const message1Id = randId().toString()
    const message1Timestamp = new Date(Date.now() - config.dmNotificationDelay)
    const chatId = randId().toString()
    await createChat(discoveryDB, user1, user2, chatId, message1Timestamp)
    await insertMessage(discoveryDB, user1, chatId, message1Id, message1, message1Timestamp)
    const message2 = "hello again"
    const message2Id = randId().toString()
    const message2Timestamp = new Date(Date.now() - config.dmNotificationDelay)
    await insertMessage(discoveryDB, user1, chatId, message2Id, message2, message2Timestamp)

    // User 2 sent 2 reactions config.dmNotificationDelay ms ago
    const reactionTimestamp = new Date(Date.now() - config.dmNotificationDelay)
    const reaction1 = "heart"
    await insertReaction(discoveryDB, user2, message1Id, reaction1, reactionTimestamp)
    const reaction2 = "fire"
    await insertReaction(discoveryDB, user2, message2Id, reaction2, reactionTimestamp)

    const expectedUser1Notifications = [
      {
        type: DMEntityType.Reaction,
        sender_user_id: user2,
        receiver_user_id: user1,
        multiple: true
      }
    ]
    const expectedUser2Notifications = [
      {
        type: DMEntityType.Message,
        sender_user_id: user1,
        receiver_user_id: user2,
        multiple: true
      }
    ]
    await processEmailNotifications(discoveryDB, identityDB, emailFrequency)
    expect(sendNotificationEmailSpy).toHaveBeenCalledTimes(2)
    expect(sendNotificationEmailSpy).toHaveBeenCalledWith({
      userId: user2,
      email: user2Email,
      frequency: emailFrequency,
      notifications: expectedUser2Notifications,
      dnDb: discoveryDB,
      identityDb: identityDB
    })
    expect(sendNotificationEmailSpy).toHaveBeenCalledWith({
      userId: user1,
      email: user1Email,
      frequency: emailFrequency,
      notifications: expectedUser1Notifications,
      dnDb: discoveryDB,
      identityDb: identityDB
    })
  })

  test("Do not process message notifications before delay", async () => {
    // Setup users and settings
    const user1 = 1
    const user2 = 2
    const userFrequency = 'live'
    const emailFrequency = 'daily'
    await createUsers(discoveryDB, [{ user_id: user1 }, { user_id: user2 }])
    await setUserEmailAndSettings(identityDB, userFrequency, user1)
    await setUserEmailAndSettings(identityDB, userFrequency, user2)

    // User 1 sends message now 
    const message = "hi from user 1"
    const messageId = randId().toString()
    const messageTimestamp = new Date(Date.now())
    const chatId = randId().toString()
    await createChat(discoveryDB, user1, user2, chatId, messageTimestamp)
    await insertMessage(discoveryDB, user1, chatId, messageId, message, messageTimestamp)

    // User 2 reacts now
    const reactionTimestamp = new Date(Date.now())
    await readChat(discoveryDB, user2, chatId, reactionTimestamp)
    const reaction = "heart"
    await insertReaction(discoveryDB, user2, messageId, reaction, reactionTimestamp)

    await processEmailNotifications(discoveryDB, identityDB, emailFrequency)
    expect(sendNotificationEmailSpy).toHaveBeenCalledTimes(0)
  })

  test("New unread messages do not trigger a live email notification", async () => {
    const sendNotificationEmailSpy = jest.spyOn(sendEmail, 'sendNotificationEmail')
      .mockImplementation(() => Promise.resolve(true))

    // Setup users and settings
    const user1 = 1
    const user2 = 2
    const frequency = 'live'
    await createUsers(discoveryDB, [{ user_id: user1 }, { user_id: user2 }])
    await setUserEmailAndSettings(identityDB, frequency, user2)

    // User 1 sent message config.dmNotificationDelay mins ago
    const message = "hi from user 1"
    const messageId = randId().toString()
    const messageTimestamp = new Date(Date.now() - config.dmNotificationDelay)
    const chatId = randId().toString()
    await createChat(discoveryDB, user1, user2, chatId, messageTimestamp)
    await insertMessage(discoveryDB, user1, chatId, messageId, message, messageTimestamp)

    await processEmailNotifications(discoveryDB, identityDB, frequency)
    expect(sendNotificationEmailSpy).toHaveBeenCalledTimes(0)
  })

  test("Unread message notifications are included in live email notification triggered by an app notification", async () => {
    // Setup users and settings
    const user1 = 1
    const user2 = 2
    const frequency = 'live'
    await createUsers(discoveryDB, [{ user_id: user1 }, { user_id: user2 }])
    const { email: user2Email } = await setUserEmailAndSettings(identityDB, frequency, user2)

    // User 1 sent message to user 2 config.dmNotificationDelay mins ago
    const message = "hi from user 1"
    const messageId = randId().toString()
    const messageTimestamp = new Date(Date.now() - config.dmNotificationDelay)
    const chatId = randId().toString()
    await createChat(discoveryDB, user1, user2, chatId, messageTimestamp)
    await insertMessage(discoveryDB, user1, chatId, messageId, message, messageTimestamp)

    // User 1 saves user 2's track
    const notificationRow = {
      id: randId(),
      specifier: user1.toString(),
      group_id: `save:100:type:track`,
      type: 'save',
      data: { type: 'track', user_id: user1, save_item_id: 100 },
      timestamp: new Date(Date.now()),
      user_ids: [user2]
    }
    await insertNotifications(discoveryDB, [notificationRow])

    const expectedNotifications = [
      {
        type: DMEntityType.Message,
        sender_user_id: user1,
        receiver_user_id: user2
      },
      {
        receiver_user_id: user2,
        blocknumber: null,
        slot: null,
        ...notificationRow
      }
    ]
    await processEmailNotifications(discoveryDB, identityDB, frequency)
    expect(sendNotificationEmailSpy).toHaveBeenCalledTimes(1)
    expect(sendNotificationEmailSpy).toHaveBeenCalledWith({
      userId: user2,
      email: user2Email,
      frequency: frequency,
      notifications: expect.arrayContaining(expectedNotifications),
      dnDb: discoveryDB,
      identityDb: identityDB
    })
  })

  test("Process new app notification", async () => {
    // Setup users and settings
    const user1 = 1
    const user2 = 2
    const frequency = 'live'
    await createUsers(discoveryDB, [{ user_id: user1 }, { user_id: user2 }])
    const { email: user2Email } = await setUserEmailAndSettings(identityDB, frequency, user2)

    // User 1 follows user 2
    const notificationRow = {
      id: randId(),
      specifier: user1.toString(),
      group_id: `follow:${user2}`,
      type: 'follow',
      data: { followee_user_id: user2, follower_user_id: user1 },
      timestamp: new Date(Date.now()),
      user_ids: [user2]
    }
    await insertNotifications(discoveryDB, [notificationRow])

    const expectedNotifications = [{
      receiver_user_id: user2,
      blocknumber: null,
      slot: null,
      ...notificationRow
    }]
    await processEmailNotifications(discoveryDB, identityDB, frequency)
    expect(sendNotificationEmailSpy).toHaveBeenCalledTimes(1)
    expect(sendNotificationEmailSpy).toHaveBeenCalledWith({
      userId: user2,
      email: user2Email,
      frequency: frequency,
      notifications: expectedNotifications,
      dnDb: discoveryDB,
      identityDb: identityDB
    })
  })

  test("Do not send emails to users that have received an email recently", async () => {
    // Setup users and settings
    const user1 = 1
    const user2 = 2
    const userFrequency = 'live'
    const emailFrequency = 'daily'
    await createUsers(discoveryDB, [{ user_id: user1 }, { user_id: user2 }])
    await setUserEmailAndSettings(identityDB, userFrequency, user1)
    await setUserEmailAndSettings(identityDB, userFrequency, user2)

    // User 2 received an email notifications 5 days and 15 minutes ago
    const previousEmail1Timestamp = new Date(moment().clone().subtract(15, 'minutes').utc().valueOf())
    const previousEmail2Timestamp = new Date(moment().clone().subtract(5, 'days').utc().valueOf())
    await insertNotificationEmails(identityDB, [
      {
        emailFrequency: enum_NotificationEmails_emailFrequency[emailFrequency],
        timestamp: previousEmail1Timestamp,
        userId: user2
      },
      {
        emailFrequency: enum_NotificationEmails_emailFrequency[emailFrequency],
        timestamp: previousEmail2Timestamp,
        userId: user2
      },
    ])

    // User 1 sent message config.dmNotificationDelay mins ago
    const message = "hi from user 1"
    const messageId = randId().toString()
    const messageTimestamp = new Date(Date.now() - config.dmNotificationDelay)
    const chatId = randId().toString()
    await createChat(discoveryDB, user1, user2, chatId, messageTimestamp)
    await insertMessage(discoveryDB, user1, chatId, messageId, message, messageTimestamp)

    await processEmailNotifications(discoveryDB, identityDB, emailFrequency)
    expect(sendNotificationEmailSpy).toHaveBeenCalledTimes(0)
  })
})
