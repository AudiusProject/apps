import { createClient, RedisClientType } from 'redis'

import { config } from './config'
import { logger } from './logger'

let redisClient: RedisClientType
let isReady: boolean

const TWO_DAYS_IN_SECONDS = 60 * 60 * 24 * 2

export const getRedisConnection = async () => {
  if (!isReady) {
    redisClient = createClient({ url: config.redisUrl })
    redisClient.on('ready', () => {
      isReady = true
    })
    await redisClient.connect()
  }
  return redisClient
}

const parseArray = (json: string | null) => {
  try {
    const parsed = JSON.parse(json ?? '[]')
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
  } catch {
    return []
  }
}

export const cacheTransaction = async (
  signature: string,
  transaction: string
) => {
  const redis = await getRedisConnection()
  const key = `solana:transaction:${signature}`
  await redis.set(key, transaction, { EX: 60 })
}

type DiscoveryNode = {
  delegateOwnerWallet: string
  endpoint: string
}

export const getCachedDiscoveryNodes = async () => {
  const redis = await getRedisConnection()
  const key = 'all-discovery-nodes-with-wallets'
  const json = await redis.get(key)
  return parseArray(json).filter(
    (p): p is DiscoveryNode =>
      'delegateOwnerWallet' in p &&
      'endpoint' in p &&
      typeof p.delegateOwnerWallet === 'string' &&
      typeof p.endpoint === 'string'
  )
}

type ContentNode = {
  delegateOwnerWallet: string
  endpoint: string
}

export const getCachedContentNodes = async () => {
  const redis = await getRedisConnection()
  const key = 'all-content-nodes'
  const json = await redis.get(key)
  return parseArray(json).filter(
    (p): p is ContentNode =>
      'delegateOwnerWallet' in p &&
      'endpoint' in p &&
      typeof p.delegateOwnerWallet === 'string' &&
      typeof p.endpoint === 'string'
  )
}

const TOKEN_ACCOUNT_CREATION_USER_LIMIT = 2
const TOKEN_ACCOUNT_CREATION_VERIFIED_USER_LIMIT = 5
const TOKEN_ACCOUNT_CREATION_SYSTEM_LIMIT = 500

export const rateLimitTokenAccountCreation = async (
  wallet: string,
  isVerified: boolean,
  memo?: string // an optional memo creates a custom rate limit bucket
) => {
  const redis = await getRedisConnection()

  const currentDate = new Date().toISOString().split('T')[0]
  // Rate limit individual users from doing this too many times
  const userKey = `ata-creation-count:user:${wallet}:${currentDate}`
  // Rate limit the whole userbase
  const key = `ata-creation-count:${memo ?? 'global'}:${currentDate}`

  const limit = isVerified
    ? TOKEN_ACCOUNT_CREATION_VERIFIED_USER_LIMIT
    : TOKEN_ACCOUNT_CREATION_USER_LIMIT

  const currentUserCount = await redis.get(userKey)
  const currentSystemCount = await redis.get(key)

  logger.info(
    {
      wallet,
      isVerified,
      currentUserCount: currentUserCount ? parseInt(currentUserCount) : 0,
      currentSystemCount: currentSystemCount ? parseInt(currentSystemCount) : 0,
      userLimit: limit,
      systemLimit: TOKEN_ACCOUNT_CREATION_SYSTEM_LIMIT
    },
    'Token account creation rate limit check'
  )

  const [userCount] = await redis
    .multi()
    .incr(userKey)
    .expire(userKey, TWO_DAYS_IN_SECONDS)
    .exec()
  if (typeof userCount !== 'number' || userCount > limit) {
    logger.error(
      {
        wallet,
        isVerified,
        userCount,
        limit
      },
      'User exceeded token account creation limit'
    )
    throw new Error(`User ${wallet} has created too many token accounts`)
  }

  const [systemCount] = await redis
    .multi()
    .incr(key)
    .expire(key, TWO_DAYS_IN_SECONDS)
    .exec()

  if (
    typeof systemCount !== 'number' ||
    systemCount > TOKEN_ACCOUNT_CREATION_SYSTEM_LIMIT
  ) {
    logger.error(
      {
        systemCount,
        systemLimit: TOKEN_ACCOUNT_CREATION_SYSTEM_LIMIT
      },
      'System exceeded token account creation limit'
    )
    throw new Error('System has created too many token accounts')
  }

  logger.info(
    {
      wallet,
      isVerified,
      newUserCount: userCount,
      newSystemCount: systemCount
    },
    'Token account creation rate limit passed'
  )
}
