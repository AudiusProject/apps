import { RelayRateLimiter, ValidLimits } from '../config/rateLimitConfig'
import { RateLimiterRes } from 'rate-limiter-flexible'
import { DeveloperApps, Users } from '@pedalboard/storage'
import { audiusSdk, config } from '..'
import { NextFunction, Request, Response } from 'express'
import { rateLimitError } from '../error'

const globalRateLimiter = new RelayRateLimiter()

export const rateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    validatedRelayRequest,
    recoveredSigner,
    signerIsUser,
    isAnonymousAllowed,
    isSenderVerifier,
    signerIsApp,
    logger
  } = res.locals.ctx
  const { encodedABI } = validatedRelayRequest

  // don't rate limit on local dev, this can block audius-cmd
  if (config.environment === 'dev') {
    next()
    return
  }

  let signer: string | null
  if (signerIsUser) {
    signer = (recoveredSigner as Users).wallet!
  } else {
    signer = (recoveredSigner as DeveloperApps).address
  }

  if (
    (signer === undefined || signer === null) &&
    !isAnonymousAllowed &&
    !isSenderVerifier
  ) {
    rateLimitError(next, 'user record does not have wallet')
    return
  }

  // if not EM transaction, return
  if (
    res.locals.ctx.validatedRelayRequest.contractRegistryKey !== 'EntityManager'
  ) {
    next()
    return
  }

  const operation = getEntityManagerActionKey(encodedABI)

  const isBlockedFromRelay = config.rateLimitBlockList.includes(signer)
  if (isBlockedFromRelay) {
    rateLimitError(next, 'blocked from relay')
    return
  }

  const limit = await determineLimit(
    signerIsUser,
    signerIsApp,
    isAnonymousAllowed,
    config.rateLimitAllowList,
    signer
  )

  try {
    const rateLimitData = await globalRateLimiter.consume({
      operation,
      signer,
      limit
    })
    logger.info({ limit }, 'calculated rate limit')
    insertReplyHeaders(res, rateLimitData)
  } catch (e) {
    if (e instanceof RateLimiterRes) {
      insertReplyHeaders(res, e as RateLimiterRes)
      logger.info(
        { limit, signer, isAnonymousAllowed, signerIsUser, operation },
        'rate limit hit'
      )
      rateLimitError(next, 'rate limit hit')
      return
    }
  }
  next()
}

export const getEntityManagerActionKey = (encodedABI: string): string => {
  const decodedABI = audiusSdk.services.entityManager!.decodeManageEntity(
    encodedABI as `0x${string}`
  )
  const { action, entityType } = decodedABI
  return action + entityType
}

const insertReplyHeaders = (res: Response, data: RateLimiterRes) => {
  const { msBeforeNext, remainingPoints, consumedPoints } = data
  res.header('Retry-After', (msBeforeNext / 1000).toString())
  res.header('X-RateLimit-Remaining', remainingPoints.toString())
  res.header(
    'X-RateLimit-Reset',
    new Date(Date.now() + msBeforeNext).toString()
  )
  res.header('X-RateLimit-Consumed', consumedPoints.toString())
}

const determineLimit = async (
  isUser: boolean,
  isApp: boolean,
  isAnonymousAllowed: boolean,
  allowList: string[],
  signer: string
): Promise<ValidLimits> => {
  const isAllowed = allowList.includes(signer)
  if (isAllowed) return 'allowlist'
  if (isUser) return 'owner'
  if (isApp) return 'app'
  if (isAnonymousAllowed) return 'anonymous'
  return 'app'
}
