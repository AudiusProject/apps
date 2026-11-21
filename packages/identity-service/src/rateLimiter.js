const Redis = require('ioredis')
const RedisStore = require('rate-limit-redis')
const config = require('./config.js')
const rateLimit = require('express-rate-limit')
const express = require('express')
const { isIPFromContentNode } = require('./utils/contentNodeIPCheck')
const redisClient = new Redis(
  config.get('redisPort'),
  config.get('redisHost'),
  { showFriendlyErrorStack: config.get('environment') !== 'production' }
)
const sigUtil = require('eth-sig-util')
const {
  generators
} = require('@audius/sdk-legacy/src/data-contracts/signatureSchemas.js')

const models = require('./models')
const { libs } = require('@audius/sdk-legacy/dist/libs')
const { errorResponseRateLimited, sendResponse } = require('./apiHelpers.js')
const AudiusABIDecoder = libs.AudiusABIDecoder

const DEFAULT_EXPIRY = 60 * 60

const isIPWhitelisted = (ip, req) => {
  const whitelistRegex = config.get('rateLimitingListensIPWhitelist')
  const isWhitelisted = whitelistRegex && !!ip.match(whitelistRegex)

  let isFromContentNode = false
  try {
    isFromContentNode = isIPFromContentNode(ip, req)
  } catch (e) {
    req.logger.error(e)
  }

  req.logger.debug(
    `isIPWhitelisted - isWhitelisted: ${isWhitelisted}, isFromContentNode: ${isFromContentNode}`
  )
  return isWhitelisted || isFromContentNode
}

const getIP = (req) => {
  const ip = req.ip
  const forwardedFor = req.get('X-Forwarded-For')

  if (!forwardedFor) {
    return { ip, isWhitelisted: true }
  }

  const headers = forwardedFor.split(',')
  if (headers.length === 1) {
    return { ip }
  }

  const senderIP = headers[headers.length - 2]
  const isWhitelisted = isIPWhitelisted(senderIP, req)
  if (isWhitelisted) {
    const forwardedIP = headers[headers.length - 3]
    if (!forwardedIP) {
      return { ip: senderIP, senderIP, isWhitelisted }
    }
    return { ip: forwardedIP, senderIP, isWhitelisted }
  }
  return { ip: senderIP, senderIP, isWhitelisted }
}

let endpointRateLimits = {}
try {
  endpointRateLimits = JSON.parse(config.get('endpointRateLimits'))
} catch (e) {
  console.error('Failed to parse endpointRateLimits!')
}

const getReqKeyGenerator =
  (options = {}) =>
  (req) => {
    const { query = [], body = [], withIp = true } = options
    let key = withIp ? getIP(req).ip : ''
    if (req.query && query.length > 0) {
      query.forEach((queryKey) => {
        if (queryKey in req.query) {
          key = key.concat(req.query[queryKey])
        }
      })
    }
    if (req.body && body.length > 0) {
      body.forEach((paramKey) => {
        if (paramKey in req.body) {
          key = key.concat(req.body[paramKey])
        }
      })
    }
    return key
  }

const onLimitReached = (req, res, options) => {
  req.logger.warn(req.rateLimit, `Rate Limit Hit`)
}

/**
 * A generic endpoint rate limiter
 * @param {object} config
 * @param {string} config.prefix redis cache key prefix
 * @param {number?} config.max maximum number of requests
 * @param {expiry?} config.expiry time period of the rate limiter
 * @param {(req: Request) => string?} config.keyGenerator redis cache
 *  key suffix (can use the request object)
 * @param {boolean?} config.skip if true, limiter is avoided
 */
const getRateLimiter = ({
  prefix,
  max,
  expiry = DEFAULT_EXPIRY,
  keyGenerator = (req) => getIP(req).ip,
  handler,
  message,
  skip
}) => {
  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: `rate:${prefix}`,
      expiry
    }),
    max, // max requests per hour
    skip,
    keyGenerator,
    handler,
    message,
    onLimitReached
  })
}

const validRouteMethods = ['get', 'post', 'put', 'delete']
const getRateLimiterMiddleware = () => {
  const router = express.Router()
  for (const route in endpointRateLimits) {
    for (const method in endpointRateLimits[route]) {
      if (validRouteMethods.includes(method)) {
        const routeMiddleware = endpointRateLimits[route][method].map(
          (limit) => {
            const { expiry, max, options = {} } = limit
            const keyGenerator = getReqKeyGenerator(options)
            return getRateLimiter({
              prefix: `${route}:${method}:${expiry}:${max}:`,
              expiry,
              max,
              keyGenerator
            })
          }
        )
        router[method](route, routeMiddleware)
      }
    }
  }
  return router
}

const getEntityManagerActionKey = (encodedABI) => {
  const decodedABI = decodeABI(encodedABI)
  const key = decodedABI.action + decodedABI.entityType
  return key
}

const decodeABI = (encodedABI) => {
  const decodedABI = AudiusABIDecoder.decodeMethod('EntityManager', encodedABI)
  const mapping = {}

  decodedABI.params.forEach((param) => {
    mapping[param.name.substring(1)] = param.value
  })

  return mapping
}

const recoverSigner = (encodedABI) => {
  const decodedABI = decodeABI(encodedABI)

  const data = generators.getManageEntityData(
    config.get('acdcChainId'),
    config.get('entityManagerAddress'),
    decodedABI.userId,
    decodedABI.entityType,
    decodedABI.entityId,
    decodedABI.action,
    decodedABI.metadata,
    decodedABI.nonce
  )
  return sigUtil.recoverTypedSignature({ data, sig: decodedABI.subjectSig })
}

const rateLimitMessage = 'Too many requests, please try again later'
const getRelayBlocklistMiddleware = (req, res, next) => {
  const signer = recoverSigner(req.body.encodedABI)
  req.body.signer = signer
  const blocklist = config.get('blocklistPublicKeyFromRelay')
  if (blocklist && blocklist.includes(signer)) {
    sendResponse(
      req,
      res,
      errorResponseRateLimited({
        message: rateLimitMessage
      })
    )
  }
  next()
}

const getRelayRateLimiterMiddleware = () => {
  return getRateLimiter({
    windowMs: 60 * 60 * 1000, // hourly
    prefix: `relayWalletRateLimiter`,
    max: async function (req) {
      const key = getEntityManagerActionKey(req.body.encodedABI)
      const signer = recoverSigner(req.body.encodedABI)

      let limit = config.get(key)
      req.user = await models.User.findOne({
        where: { walletAddress: signer },
        attributes: [
          'id',
          'blockchainUserId',
          'walletAddress',
          'handle',
          'isBlockedFromRelay',
          'isBlockedFromNotifications',
          'isBlockedFromEmails',
          'appliedRules'
        ]
      })
      const allowlist = config.get('allowlistPublicKeyFromRelay')
      if (req.user) {
        limit = limit.owner
        req.isFromApp = false
      } else {
        if (allowlist && allowlist.includes(signer)) {
          limit = limit.allowlist
        } else {
          limit = limit.app
        }
        req.isFromApp = true
      }

      return limit
    },
    keyGenerator: function (req) {
      const key = getEntityManagerActionKey(req.body.encodedABI)
      const signer = recoverSigner(req.body.encodedABI)
      return ':::' + key + ':' + signer
    },
    handler: (req, res) => {
      try {
        const key = getEntityManagerActionKey(req.body.encodedABI)
        const signer = recoverSigner(req.body.encodedABI)
        req.logger.error(
          { _signer: signer, isApp: req.isFromApp },
          `Rate limited sender ${signer} performing ${key}`
        )
      } catch (error) {
        req.logger.error(`Cannot relay without sender address`)
      }
      sendResponse(
        req,
        res,
        errorResponseRateLimited({
          message: rateLimitMessage
        })
      )
    }
  })
}

module.exports = {
  getIP,
  isIPWhitelisted,
  getRateLimiter,
  getRateLimiterMiddleware,
  getRelayBlocklistMiddleware,
  getRelayRateLimiterMiddleware
}
