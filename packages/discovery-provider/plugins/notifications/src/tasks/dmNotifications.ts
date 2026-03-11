import { Knex } from 'knex'
import type { RedisClientType } from 'redis'
import { config } from './../config'
import { logger } from './../logger'
import { Message } from './../processNotifications/mappers/message'
import { MessageReaction } from './../processNotifications/mappers/messageReaction'
import type {
  DMNotification,
  DMReactionNotification
} from './../types/notifications'
import { getRedisConnection } from './../utils/redisConnection'
import { Timer } from '../utils/timer'
import { makeChatId } from '../utils/chatId'
import { chunk } from 'lodash'

// Sort notifications in ascending order according to timestamp
function notificationTimestampComparator(
  n1: Message | MessageReaction,
  n2: Message | MessageReaction
): number {
  if (n1.notification.timestamp < n2.notification.timestamp) {
    return -1
  }
  if (n1.notification.timestamp > n2.notification.timestamp) {
    return 1
  }
  return 0
}

async function getCursors(redis: RedisClientType): Promise<{
  maxTimestamp: Date
  minMessageTimestamp: Date
  minReactionTimestamp: Date
  lastIndexedBlastId: string
  lastIndexedBlastUserId: number
}> {
  const maxCursor = new Date(Date.now() - config.dmNotificationDelay)

  // Get min cursors from redis (timestamps of the last indexed notifications)
  let minMessageCursor = maxCursor
  let minReactionCursor = maxCursor
  const cachedMessageTimestamp = await redis.get(
    config.lastIndexedMessageRedisKey
  )
  if (cachedMessageTimestamp) {
    minMessageCursor = new Date(Date.parse(cachedMessageTimestamp))
  }
  const cachedReactionTimestamp = await redis.get(
    config.lastIndexedReactionRedisKey
  )
  if (cachedReactionTimestamp) {
    minReactionCursor = new Date(Date.parse(cachedReactionTimestamp))
  }
  const lastIndexedBlastId = await redis.get(config.lastIndexedBlastIdRedisKey)
  let lastIndexedBlastUserId = null
  const cachedLastIndexedBlastUserId = await redis.get(
    config.lastIndexedBlastUserIdRedisKey
  )
  if (cachedLastIndexedBlastUserId) {
    lastIndexedBlastUserId = parseInt(cachedLastIndexedBlastUserId)
  }

  return {
    maxTimestamp: maxCursor,
    minMessageTimestamp: minMessageCursor,
    minReactionTimestamp: minReactionCursor,
    lastIndexedBlastId,
    lastIndexedBlastUserId
  }
}

async function getUnreadMessages(
  discoveryDB: Knex,
  minTimestamp: Date,
  maxTimestamp: Date
): Promise<DMNotification[]> {
  return await discoveryDB
    .select(
      'chat_member.chat_id as chat_id',
      'chat_message.user_id as sender_user_id',
      'chat_member.user_id as receiver_user_id',
      'chat_message.created_at as timestamp'
    )
    .from('chat_message')
    .innerJoin('chat_member', 'chat_message.chat_id', 'chat_member.chat_id')
    .where('chat_message.blast_id', null)
    // Javascript dates are limited to 3 decimal places (milliseconds). Truncate the postgresql timestamp to match.
    .whereRaw(
      `date_trunc('milliseconds', chat_message.created_at) > greatest(chat_member.last_active_at, ?::timestamp)`,
      [minTimestamp.toISOString()]
    )
    .andWhereRaw(`date_trunc('milliseconds', chat_message.created_at) <= ?`, [
      maxTimestamp.toISOString()
    ])
    .andWhereRaw('chat_message.user_id != chat_member.user_id')
}

async function getUnreadReactions(
  discoveryDB: Knex,
  minTimestamp: Date,
  maxTimestamp: Date
): Promise<DMReactionNotification[]> {
  return await discoveryDB
    .select(
      'chat_member.chat_id as chat_id',
      'chat_message.message_id',
      'chat_message_reactions.user_id as sender_user_id',
      'chat_message.user_id as receiver_user_id',
      'chat_message_reactions.reaction as reaction',
      'chat_message_reactions.updated_at as timestamp'
    )
    .from('chat_message_reactions')
    .innerJoin(
      'chat_message',
      'chat_message.message_id',
      'chat_message_reactions.message_id'
    )
    .joinRaw(
      'join chat_member on chat_member.chat_id = chat_message.chat_id and chat_member.user_id = chat_message.user_id'
    )
    // Javascript dates are limited to 3 decimal places (milliseconds). Truncate the postgresql timestamp to match.
    .whereRaw(
      `date_trunc('milliseconds', chat_message_reactions.updated_at) > greatest(chat_member.last_active_at, ?)`,
      [minTimestamp.toISOString()]
    )
    .andWhereRaw(
      `date_trunc('milliseconds', chat_message_reactions.updated_at) <= ? `,
      [maxTimestamp.toISOString()]
    )
    .andWhereRaw('chat_message_reactions.user_id != chat_member.user_id')
}

// We use the last indexed blast_id and user_id to get the next batch of blasts.
// Cursor on user_id because we prefer skipping a user to duplicate notifs.
async function getNewBlasts(
  discoveryDB: Knex,
  lastIndexedBlastId?: string,
  lastIndexedBlastUserId?: number
): Promise<{
  lastIndexedBlastId: string
  lastIndexedBlastUserId: number
  messages: DMNotification[]
}> {
  let lastIndexedBlastTimestamp
  let effectiveBlastId = lastIndexedBlastId
  if (lastIndexedBlastId) {
    const result = await discoveryDB
      .select('chat_blast.created_at as timestamp')
      .from('chat_blast')
      .where('chat_blast.blast_id', lastIndexedBlastId)
      .first()
    lastIndexedBlastTimestamp = result?.timestamp
  }

  // First time running (e.g. new Redis): do not backfill. Set cursor to latest blast
  // so we only process new blasts going forward and avoid flooding users with old notifications.
  let skipSendingBlasts = false
  if (!lastIndexedBlastTimestamp) {
    const latestBlast = await discoveryDB
      .select('blast_id', 'created_at')
      .from('chat_blast')
      .whereRaw(
        `chat_blast.created_at <= NOW() - INTERVAL '${config.blastDelay} seconds'`
      )
      .orderBy('chat_blast.created_at', 'desc')
      .first()
    if (latestBlast) {
      effectiveBlastId = latestBlast.blast_id
      lastIndexedBlastTimestamp = latestBlast.created_at
      skipSendingBlasts = true
    } else {
      // No blasts yet; use now so we don't match anything
      lastIndexedBlastTimestamp = new Date().toISOString()
    }
  }
  const userId = lastIndexedBlastUserId

  const messages = await discoveryDB.raw(
    `
    WITH blast AS (
      SELECT * FROM chat_blast WHERE chat_blast.blast_id = ?
    ),
    targ AS (
      SELECT
        blast_id,
        from_user_id,
        to_user_id,
        blast.created_at
      FROM blast
      JOIN chat_blast_audience(blast.blast_id) USING (blast_id)
      WHERE chat_allowed(from_user_id, to_user_id)
      AND ?::INTEGER IS NULL OR to_user_id > ?
      ORDER BY to_user_id ASC
      LIMIT ?
    )
    SELECT blast_id, from_user_id AS sender_user_id, to_user_id AS receiver_user_id, created_at FROM targ;
    `,
    [effectiveBlastId, userId, userId, config.blastUserBatchSize]
  )

  // Need to calculate pending chat ids for each message for deep linking
  const formattedMessages = messages?.rows?.map((message) => {
    return {
      ...message,
      chat_id: makeChatId([message.sender_user_id, message.receiver_user_id])
    }
  })

  // If no messages found, skip to the next blast.
  // If there isn't one, then we've reached the end of the blast table. Cursor
  // should stay the same until new blasts come in.
  let newBlastIdCursor
  let newUserIdCursor
  if (!formattedMessages?.length) {
    const blastIdResult = await discoveryDB
      .select('blast_id')
      .from('chat_blast')
      .whereRaw(
        `date_trunc('milliseconds', chat_blast.created_at) > ?
        AND chat_blast.created_at <= NOW() - INTERVAL '${config.blastDelay} seconds'`,
        lastIndexedBlastTimestamp
      )
      .orderBy('chat_blast.created_at', 'asc')
      .first()
    newBlastIdCursor = blastIdResult ? blastIdResult.blast_id : effectiveBlastId
    newUserIdCursor = blastIdResult ? null : lastIndexedBlastUserId
  } else {
    newBlastIdCursor = formattedMessages[0].blast_id
    newUserIdCursor = formattedMessages.at(-1).receiver_user_id
  }

  return {
    lastIndexedBlastId: newBlastIdCursor,
    lastIndexedBlastUserId: newUserIdCursor,
    messages: skipSendingBlasts ? [] : formattedMessages
  }
}

function setLastIndexedTimestamp(
  redis: RedisClientType,
  redisKey: string,
  maxTimestamp: Date,
  notifications: Message[] | MessageReaction[]
) {
  if (notifications.length > 0) {
    notifications.sort(notificationTimestampComparator)
    const lastIndexedTimestamp =
      notifications[
        notifications.length - 1
      ].notification.timestamp.toISOString()
    redis.set(redisKey, lastIndexedTimestamp)
  } else {
    redis.set(redisKey, maxTimestamp.toISOString())
  }
}

function setLastIndexedBlastIds(
  redis: RedisClientType,
  blastId?: string,
  userId?: number | null
) {
  if (blastId) {
    redis.set(config.lastIndexedBlastIdRedisKey, blastId)
  }
  userId === null
    ? redis.del(config.lastIndexedBlastUserIdRedisKey)
    : redis.set(config.lastIndexedBlastUserIdRedisKey, userId)
}

enum DMPhase {
  START = 'START',
  GET_UNREAD_MESSAGES = 'GET_UNREAD_MESSAGES',
  GET_UNREAD_REACTIONS = 'GET_UNREAD_REACTIONS',
  GET_NEW_BLASTS = 'GET_NEW_BLASTS',
  PUSH_NOTIFICATIONS = 'PUSH_NOTIFICATIONS',
  FINSH = 'FINSH'
}

export async function sendDMNotifications(
  discoveryDB: Knex,
  identityDB: Knex,
  isBrowserPushEnabled?: boolean
) {
  const timer = new Timer('dm')
  try {
    // Query DN for unread messages and reactions between min and max cursors
    const redis = await getRedisConnection()
    const cursors = await getCursors(redis)

    timer.logMessage(DMPhase.GET_UNREAD_MESSAGES)
    const unreadMessages = await getUnreadMessages(
      discoveryDB,
      cursors.minMessageTimestamp,
      cursors.maxTimestamp
    )
    if (unreadMessages.length > 0) {
      console.log(
        `dmNotifications: unread message notifications: ${JSON.stringify(
          unreadMessages
        )}`
      )
    }

    timer.logMessage(DMPhase.GET_UNREAD_REACTIONS)

    const unreadReactions = await getUnreadReactions(
      discoveryDB,
      cursors.minReactionTimestamp,
      cursors.maxTimestamp
    )
    if (unreadReactions.length > 0) {
      console.log(
        `dmNotifications: unread message reaction notifications: ${JSON.stringify(
          unreadReactions
        )}`
      )
    }

    timer.logMessage(DMPhase.GET_NEW_BLASTS)
    const {
      lastIndexedBlastId,
      lastIndexedBlastUserId,
      messages: newBlasts
    } = await getNewBlasts(
      discoveryDB,
      cursors.lastIndexedBlastId,
      cursors.lastIndexedBlastUserId
    )
    if (newBlasts.length > 0) {
      console.log(
        `dmNotifications: last indexed blastId: ${lastIndexedBlastId}, last indexed userId: ${lastIndexedBlastUserId} new chat blast notifications: ${JSON.stringify(
          newBlasts
        )}`
      )
      logger.info(
        `dmNotifications: last indexed blastId: ${lastIndexedBlastId}, last indexed userId: ${lastIndexedBlastUserId} total new chat blast notifications: ${newBlasts.length}`
      )
    }

    // Convert to notifications
    const messageNotifications = unreadMessages.map(
      (message) => new Message(discoveryDB, identityDB, message)
    )
    const reactionNotifications = unreadReactions.map(
      (reaction) => new MessageReaction(discoveryDB, identityDB, reaction)
    )
    const blastNotifications = newBlasts.map(
      (blast) => new Message(discoveryDB, identityDB, blast)
    )
    const notifications: Array<Message | MessageReaction> = messageNotifications
      .concat(reactionNotifications)
      .concat(blastNotifications)

    // Sort notifications by timestamp (asc)
    notifications.sort(notificationTimestampComparator)
    timer.logMessage(DMPhase.PUSH_NOTIFICATIONS)

    // Send push notifications in batches
    const batches = chunk(notifications, config.notificationBatchSize)
    for (const batch of batches) {
      await Promise.all(
        batch.map(async (notification) => {
          await notification.processNotification({
            isLiveEmailEnabled: false,
            isBrowserPushEnabled
          })
        })
      )
    }

    // Set last indexed timestamps in redis
    setLastIndexedTimestamp(
      redis,
      config.lastIndexedMessageRedisKey,
      cursors.maxTimestamp,
      messageNotifications
    )
    setLastIndexedTimestamp(
      redis,
      config.lastIndexedReactionRedisKey,
      cursors.maxTimestamp,
      reactionNotifications
    )
    setLastIndexedBlastIds(redis, lastIndexedBlastId, lastIndexedBlastUserId)

    if (notifications.length > 0) {
      timer.logMessage(DMPhase.PUSH_NOTIFICATIONS)
      logger.info(
        {
          ...timer.getContext(),
          numberNotifications: notifications.length
        },
        'dmNotifications task: processed new DM push notifications'
      )
    }
  } catch (err) {
    logger.error({
      ...timer.getContext(),
      message: err.message
    })
  }
}
