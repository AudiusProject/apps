import { Knex } from 'knex'
import {
  RepostRow,
  FollowRow,
  UserRow as DNUserRow,
  TrackRow,
  SaveRow,
  NotificationRow,
  PlaylistRow,
  BlockRow,
  UserTipRow,
  ReactionRow,
  UserBankAccountRow,
  UserBankTxRow,
  ChallengeDisbursementRow,
  RewardManagerTxRow,
  SubscriptionRow,
  SupporterRankUpRow
} from '../types/dn'
import { UserRow as IdentityUserRow } from '../types/identity'
import {
  enum_NotificationDeviceTokens_deviceType,
  NotificationDeviceTokenRow,
  UserNotificationMobileSettingRow,
  NotificationEmailRow
} from '../types/identity'
import { getDB } from '../conn'
import { expect, jest } from '@jest/globals'
import { Processor } from '../main'
import { getRedisConnection } from './redisConnection'
import { config } from '../config'
import { EmailFrequency } from '../processNotifications/mappers/userNotificationSettings'

type SetupTestConfig = {
  mockTime?: boolean
}

export const setupTest = async (setupConfig?: SetupTestConfig) => {
  const { mockTime = true } = setupConfig ?? {}
  const testName = expect
    .getState()
    .currentTestName.replace(/\s/g, '_')
    .toLocaleLowerCase()
  await Promise.all([
    createTestDB(process.env.DN_DB_URL, testName),
    createTestDB(process.env.IDENTITY_DB_URL, testName)
  ])

  const processor = new Processor()

  // eslint-disable-next-line
  // @ts-ignore
  processor.server.app.listen = jest.fn((port: number, cb: () => void) => cb())

  await processor.init({
    identityDBUrl: replaceDBName(process.env.IDENTITY_DB_URL, testName),
    discoveryDBUrl: replaceDBName(process.env.DN_DB_URL, testName)
  })
  jest
    .spyOn(processor.remoteConfig, 'getFeatureVariableEnabled')
    .mockImplementation((name: string, field: string) => true)

  // Mock current date for test result consistency
  if (mockTime) {
    Date.now = jest.fn(() => new Date('2020-05-13T12:33:37.000Z').getTime())
  }
  const redis = await getRedisConnection()
  redis.del(config.lastIndexedMessageRedisKey)
  redis.del(config.lastIndexedReactionRedisKey)
  return { processor }
}

export const replaceDBName = (connectionString: string, testName: string) => {
  const connection = connectionString.substring(
    0,
    connectionString.lastIndexOf('/')
  )
  return `${connection}/${testName}`
}

export const createTestDB = async (
  connectionString: string,
  testName: string
) => {
  const templateDb = /[^/]*$/.exec(connectionString)[0]
  const connection = connectionString.substring(
    0,
    connectionString.lastIndexOf('/')
  )
  const postgresConnection = `${connection}/postgres`
  const db = await getDB(postgresConnection)
  await db.raw('DROP DATABASE IF EXISTS :test_name:', { test_name: testName })
  await db.raw('CREATE DATABASE :test_name: TEMPLATE :template:', {
    test_name: testName,
    template: templateDb
  })
  await db.destroy()
}

export const dropTestDB = async (
  connectionString: string,
  testName: string
) => {
  const connection = connectionString.substring(
    0,
    connectionString.lastIndexOf('/')
  )
  const postgresConnection = `${connection}/postgres`
  const db = await getDB(postgresConnection)
  await db.raw('DROP DATABASE IF EXISTS :test_name:', { test_name: testName })
  await db.destroy()
}

export const resetTests = async (processor) => {
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
}

type CreateTrack = Pick<TrackRow, 'owner_id' | 'track_id'> & Partial<TrackRow>
export const createTracks = async (db: Knex, tracks: CreateTrack[]) => {
  await db
    .insert(
      tracks.map((track) => ({
        is_delete: false,
        is_current: true,
        is_unlisted: false,
        is_available: true,
        created_at: new Date(Date.now()),
        updated_at: new Date(Date.now()),
        title: `track_title_${track.track_id}`,
        track_segments: [],
        ...track
      }))
    )
    .into('tracks')
  await db
    .insert(
      tracks.map((track) => ({
        is_current: true,
        slug: `track_${track.track_id}`,
        title_slug: `track_${track.track_id}`,
        collision_id: track.track_id,
        blockhash: `0x${track.track_id}`,
        blocknumber: 1,
        txhash: `0x${track.track_id}`,
        track_id: track.track_id,
        owner_id: track.owner_id
      }))
    )
    .into('track_routes')
}

type CreatePlaylist = Pick<PlaylistRow, 'playlist_owner_id' | 'playlist_id'> &
  Partial<PlaylistRow>
export const createPlaylists = async (
  db: Knex,
  playlists: CreatePlaylist[]
) => {
  await db
    .insert(
      playlists.map((playlist) => ({
        is_delete: false,
        is_private: false,
        is_current: true,
        is_album: false,
        created_at: new Date(Date.now()),
        updated_at: new Date(Date.now()),
        playlist_name: `playlist_name_${playlist.playlist_id}`,
        description: `description_${playlist.playlist_id}`,
        playlist_contents: [],
        ...playlist
      }))
    )
    .into('playlists')
  await db
    .insert(
      playlists.map((playlist) => ({
        is_current: true,
        slug: `playlist_${playlist.playlist_id}`,
        title_slug: `playlist_${playlist.playlist_id}`,
        collision_id: playlist.playlist_id,
        blockhash: `0x${playlist.playlist_id}`,
        blocknumber: 1,
        txhash: `0x${playlist.playlist_id}`,
        playlist_id: playlist.playlist_id,
        owner_id: playlist.playlist_owner_id
      }))
    )
    .into('playlist_routes')
}

type CreateUserTip = Pick<UserTipRow, 'sender_user_id' | 'receiver_user_id'> &
  Partial<UserTipRow>
export const createUserTip = async (db: Knex, userTips: CreateUserTip[]) => {
  await db
    .insert(
      userTips.map((userTip) => ({
        amount: '1' + '00000000',
        signature: `sig_${userTip.sender_user_id}_${userTip.receiver_user_id}`,
        slot: 1,
        created_at: new Date(Date.now()),
        ...userTip
      }))
    )
    .into('user_tips')
}

type CreateReaction = Pick<
  ReactionRow,
  'reacted_to' | 'reaction_type' | 'sender_wallet' | 'reaction_value'
> &
  Partial<ReactionRow>
export const createReaction = async (db: Knex, reactions: CreateReaction[]) => {
  await db
    .insert(
      reactions.map((reaction) => ({
        slot: 1,
        timestamp: new Date(Date.now()),
        ...reaction
      }))
    )
    .into('reactions')
}

type createBlocks = Partial<BlockRow>
export const createBlocks = async (db: Knex, blocks: createBlocks[]) => {
  await db
    .insert(
      blocks.map((block, ind) => ({
        blockhash: '0x2',
        parenthash: '0x0',
        is_current: false,
        number: ind,
        ...block
      }))
    )
    .into('blocks')
}

type CreateSupporterRankUp = Pick<
  SupporterRankUpRow,
  'sender_user_id' | 'receiver_user_id' | 'rank'
> &
  Partial<SupporterRankUpRow>
export const createSupporterRankUp = async (
  db: Knex,
  rankUps: CreateSupporterRankUp[]
) => {
  await db
    .insert(
      rankUps.map((rankUp) => ({
        slot: 1,
        ...rankUp
      }))
    )
    .into('supporter_rank_ups')
}

type CreateUser = Pick<DNUserRow, 'user_id'> & Partial<DNUserRow>
export const createUsers = async (db: Knex, users: CreateUser[]) => {
  await db
    .insert(
      users.map((user) => ({
        is_current: true,
        created_at: new Date(Date.now()),
        updated_at: new Date(Date.now()),
        name: `user_${user.user_id}`,
        handle: `handle_${user.user_id}`,
        wallet: `0x${user.user_id}`,
        creator_node_endpoint: `https://dn1.io,https://dn2.io,https://dn3.io`,
        is_available: true,
        ...user
      }))
    )
    .into('users')
}

type CreateRepost = Pick<
  RepostRow,
  'user_id' | 'repost_item_id' | 'repost_type'
> &
  Partial<RepostRow>
export const createReposts = async (db: Knex, reposts: CreateRepost[]) => {
  await db
    .insert(
      reposts.map((repost) => ({
        is_delete: false,
        is_current: true,
        created_at: new Date(Date.now()),
        ...repost
      }))
    )
    .into('reposts')
}

type CreateSave = Pick<SaveRow, 'user_id' | 'save_item_id' | 'save_type'> &
  Partial<SaveRow>
export const createSaves = async (db: Knex, saves: CreateSave[]) => {
  await db
    .insert(
      saves.map((save) => ({
        is_delete: false,
        is_current: true,
        created_at: new Date(Date.now()),
        ...save
      }))
    )
    .into('saves')
}

type CreateFollow = Pick<FollowRow, 'followee_user_id' | 'follower_user_id'> &
  Partial<FollowRow>
export const insertFollows = async (db: Knex, follows: CreateFollow[]) => {
  await db
    .insert(
      follows.map((follow) => ({
        is_delete: false,
        is_current: true,
        created_at: new Date(Date.now()),
        ...follow
      }))
    )
    .into('follows')
}

type CreateUserBank = Pick<
  UserBankAccountRow,
  'signature' | 'ethereum_address' | 'bank_account'
> &
  Partial<UserBankAccountRow>
export const createUserBank = async (db: Knex, userBanks: CreateUserBank[]) => {
  await db
    .insert(
      userBanks.map((userBlock) => ({
        created_at: new Date(Date.now()),
        ...userBlock
      }))
    )
    .into('user_bank_accounts')
}

type CreateUserBankTx = Partial<UserBankTxRow>
export const createUserBankTx = async (db: Knex, txs: CreateUserBankTx[]) => {
  await db
    .insert(
      txs.map((tx) => ({
        created_at: new Date(Date.now()),
        ...tx
      }))
    )
    .into('user_bank_txs')
}

type CreateChallengeReward = Pick<
  ChallengeDisbursementRow,
  'challenge_id' | 'user_id' | 'specifier' | 'amount'
> &
  Partial<ChallengeDisbursementRow>
export const createChallengeReward = async (
  db: Knex,
  rewards: CreateChallengeReward[]
) => {
  await db
    .insert(
      rewards.map((reward) => ({
        slot: 1,
        signature: '0x1',
        ...reward
      }))
    )
    .into('challenge_disbursements')
}

type RewardManagerTx = Partial<RewardManagerTxRow>
export const createRewardManagerTx = async (
  db: Knex,
  rewards: RewardManagerTx[]
) => {
  await db
    .insert(
      rewards.map((reward) => ({
        created_at: new Date(Date.now()),
        ...reward
      }))
    )
    .into('reward_manager_txs')
}

type CreateSubscription = Pick<SubscriptionRow, 'subscriber_id' | 'user_id'> &
  Partial<SubscriptionRow>
export const createSubscription = async (
  db: Knex,
  subscriptions: CreateSubscription[]
) => {
  await db
    .insert(
      subscriptions.map((sub) => ({
        is_delete: false,
        is_current: true,
        ...sub
      }))
    )
    .into('subscriptions')
}

type CreateNotificationRow = Pick<
  NotificationRow,
  'id' | 'specifier' | 'group_id' | 'type' | 'timestamp' | 'user_ids'
> &
  Partial<NotificationRow>
export const insertNotifications = async (
  db: Knex,
  notifications: CreateNotificationRow[]
) => {
  await db
    .insert(
      notifications.map((n) => ({
        timestamp: new Date(Date.now()),
        ...n
      }))
    )
    .into('notification')
}

type CreateNotificationEmail = Pick<
  NotificationEmailRow,
  'emailFrequency' | 'timestamp' | 'userId'
> &
  Partial<NotificationEmailRow>
export const insertNotificationEmails = async (
  db: Knex,
  notificationEmails: CreateNotificationEmail[]
) => {
  await db
    .insert(
      notificationEmails.map((email) => ({
        createdAt: email.timestamp,
        updatedAt: email.timestamp,
        ...email
      }))
    )
    .into('NotificationEmails')
}

export const setUserEmailAndSettings = async (
  db: Knex,
  frequency: EmailFrequency,
  userId: number,
  timezone?: string
): Promise<IdentityUserRow> => {
  const user = {
    createdAt: new Date(Date.now()),
    updatedAt: new Date(Date.now()),
    lastSeenDate: new Date(Date.now()),
    handle: `user_${userId}`,
    email: `user_${userId}@gmail.com`,
    blockchainUserId: userId,
    timezone: timezone || 'Asia/Calcutta'
  }
  await db.insert(user).into('Users')
  await db
    .insert({
      createdAt: new Date(Date.now()),
      updatedAt: new Date(Date.now()),
      userId: userId,
      emailFrequency: frequency
    })
    .into('UserNotificationSettings')
  return user
}

// Generate random Id betweeen 0 and 999
export function randId() {
  return Math.floor(Math.random() * 1000)
}

export async function clearAllTables(db: Knex) {
  await db.raw(
    `
      DO
      $func$
      BEGIN
        EXECUTE
        (
          SELECT 'TRUNCATE TABLE ' || string_agg(format('%I.%I', table_schema, table_name), ', ') || ' RESTART IdENTITY CASCADE'
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        );
      END
      $func$;
    `
  )
}

export async function createChat(
  db: Knex,
  user1: number,
  user2: number,
  chatId: string,
  timestamp: Date
) {
  await db
    .insert({
      chat_id: chatId,
      created_at: timestamp.toISOString(),
      last_message_at: timestamp.toISOString()
    })
    .into('chat')

  await db
    .insert([
      {
        chat_id: chatId,
        invited_by_user_id: user1,
        invite_code: chatId,
        user_id: user1
      },
      {
        chat_id: chatId,
        invited_by_user_id: user1,
        invite_code: chatId,
        user_id: user2
      }
    ])
    .into('chat_member')
}

export async function readChat(
  db: Knex,
  userId: number,
  chatId: string,
  timestamp: Date
) {
  await db('chat_member')
    .where({
      user_id: userId,
      chat_id: chatId
    })
    .update({
      last_active_at: timestamp.toISOString()
    })
}

export async function insertMessage(
  db: Knex,
  senderId: number,
  chatId: string,
  messageId: string,
  message: string,
  timestamp: Date
) {
  await db
    .insert({
      message_id: messageId,
      chat_id: chatId,
      user_id: senderId,
      created_at: timestamp.toISOString(),
      ciphertext: message
    })
    .into('chat_message')

  await db('chat')
    .where({
      chat_id: chatId
    })
    .update({
      last_message_at: timestamp.toISOString()
    })
}

export async function insertReaction(
  db: Knex,
  senderId: number,
  messageId: string,
  reaction: string,
  timestamp: Date
) {
  await db
    .insert({
      user_id: senderId,
      message_id: messageId,
      reaction: reaction,
      created_at: timestamp.toISOString(),
      updated_at: timestamp.toISOString()
    })
    .into('chat_message_reactions')
}

type MoblieDevice = Pick<NotificationDeviceTokenRow, 'userId'> &
  Partial<NotificationDeviceTokenRow>
export async function insertMobileDevices(
  db: Knex,
  mobileDevices: MoblieDevice[]
) {
  const currentTimestamp = new Date(Date.now()).toISOString()
  await db
    .insert(
      mobileDevices.map((device, idx) => ({
        deviceToken: randId().toString(),
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
        deviceType: 'ios',
        awsARN: `arn:${device.userId}`,
        ...device
      }))
    )
    .into('NotificationDeviceTokens')
  await insertAbusiveSettings(
    db,
    mobileDevices.map((device) =>
      createAbusiveSettingForUser(device.userId, false, false, true)
    )
  )
}

type MobileSetting = Pick<UserNotificationMobileSettingRow, 'userId'> &
  Partial<UserNotificationMobileSettingRow>
export async function insertMobileSettings(
  db: Knex,
  mobileSettings: MobileSetting[]
) {
  const currentTimestamp = new Date(Date.now()).toISOString()
  await db
    .insert(
      mobileSettings.map((setting) => ({
        createdAt: currentTimestamp,
        updatedAt: currentTimestamp,
        ...setting
      }))
    )
    .into('UserNotificationMobileSettings')
}

export function createAbusiveSettingForUser(
  blockchainUserId,
  isBlockedFromRelay,
  isBlockedFromNotifications,
  isEmailDeliverable
) {
  return {
    blockchainUserId,
    isBlockedFromRelay,
    isBlockedFromNotifications,
    isEmailDeliverable
  }
}

export async function insertAbusiveSettings(
  db: Knex,
  abusiveSettings: {
    blockchainUserId: number
    isBlockedFromRelay: boolean
    isBlockedFromNotifications: boolean
    isEmailDeliverable: boolean
  }[]
) {
  await db
    .insert(
      abusiveSettings.map((setting) => ({
        email: 'fake_email@audius.co',
        lastSeenDate: new Date(Date.now()).toISOString(),
        createdAt: new Date(Date.now()).toISOString(),
        updatedAt: new Date(Date.now()).toISOString(),
        ...setting
      }))
    )
    .into('Users')
}

export type UserWithDevice = {
  userId: number
  name: string
  deviceType: string
  awsARN: string
}

export async function setupTwoUsersWithDevices(
  discoveryDB: Knex,
  identityDB: Knex
): Promise<{ user1: UserWithDevice; user2: UserWithDevice }> {
  const user1 = randId()
  const user1Name = 'user 1'
  const user2 = randId()
  const user2Name = 'user 2'
  await createUsers(discoveryDB, [
    { user_id: user1, name: user1Name, is_current: true },
    { user_id: user2, name: user2Name, is_current: true }
  ])
  await insertMobileSettings(identityDB, [{ userId: user1 }, { userId: user2 }])
  const deviceType1 = enum_NotificationDeviceTokens_deviceType.ios
  const awsARN1 = 'arn:1'
  const deviceType2 = enum_NotificationDeviceTokens_deviceType.android
  const awsARN2 = 'arn:2'
  await insertMobileDevices(identityDB, [
    { userId: user1, deviceType: deviceType1, awsARN: awsARN1 },
    { userId: user2, deviceType: deviceType2, awsARN: awsARN2 }
  ])
  return {
    user1: {
      userId: user1,
      name: user1Name,
      deviceType: deviceType1,
      awsARN: awsARN1
    },
    user2: {
      userId: user2,
      name: user2Name,
      deviceType: deviceType2,
      awsARN: awsARN2
    }
  }
}
