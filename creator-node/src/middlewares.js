const axios = require('axios')

const { sendResponse, errorResponse, errorResponseUnauthorized, errorResponseServerError } = require('./apiHelpers')
const config = require('./config')
const sessionManager = require('./sessionManager')
const models = require('./models')
const utils = require('./utils')

/** Ensure valid cnodeUser and session exist for provided session token. */
async function authMiddleware (req, res, next) {
  // Get session token
  const sessionToken = req.get(sessionManager.sessionTokenHeader)
  if (!sessionToken) {
    return sendResponse(req, res, errorResponseUnauthorized('Authentication token not provided'))
  }

  // Ensure session exists for session token
  const cnodeUserUUID = await sessionManager.verifySession(sessionToken)
  if (!cnodeUserUUID) {
    return sendResponse(req, res, errorResponseUnauthorized('Invalid authentication token'))
  }

  // Ensure cnodeUser exists for session
  const cnodeUser = await models.CNodeUser.findOne({ where: { cnodeUserUUID } })
  if (!cnodeUser) {
    return sendResponse(req, res, errorResponseUnauthorized('No node user exists for provided authentication token'))
  }

  // Attach session object to request
  req.session = {
    cnodeUser: cnodeUser,
    wallet: cnodeUser.walletPublicKey,
    cnodeUserUUID: cnodeUserUUID
  }
  next()
}

/** Ensure resource write access */
async function syncLockMiddleware (req, res, next) {
  if (req.session && req.session.wallet) {
    const redisClient = req.app.get('redisClient')
    const redisKey = redisClient.getNodeSyncRedisKey(req.session.wallet)
    const lockHeld = await redisClient.lock.getLock(redisKey)
    if (lockHeld) {
      return sendResponse(req, res, errorResponse(423,
        `Cannot change state of wallet ${req.session.wallet}. Node sync currently in progress.`
      ))
    }
  }
  next()
}

/** Blocks writes if node is not the primary for audiusUser associated with wallet. */
async function ensurePrimaryMiddleware (req, res, next) {
  if (config.get('isUserMetadataNode')) next()

  const start = Date.now()

  if (!req.session || !req.session.wallet) {
    return sendResponse(req, res, errorResponseUnauthorized('User must be logged in'))
  }

  let serviceEndpoint
  try {
    serviceEndpoint = await _getOwnEndpoint(req)
  } catch (e) {
    return sendResponse(req, res, errorResponseServerError(e))
  }

  let creatorNodeEndpoints
  try {
    creatorNodeEndpoints = await _getCreatorNodeEndpoints(req, req.session.wallet)
  } catch (e) {
    return sendResponse(req, res, errorResponseServerError(e))
  }
  const primary = creatorNodeEndpoints[0]

  // Error if this node is not primary for user.
  if (!primary || (primary && serviceEndpoint !== primary)) {
    return sendResponse(
      req,
      res,
      errorResponseUnauthorized(`This node (${serviceEndpoint}) is not primary for user. Primary is: ${primary}`)
    )
  }
  req.session.nodeIsPrimary = true
  req.session.creatorNodeEndpoints = creatorNodeEndpoints

  console.log(`ensurePrimaryMiddleware route time ${Date.now() - start}`)
  next()
}

/**
 * Tell all secondaries to sync against self.
 * @dev - Is not a middleware so it can be run before responding to client.
 */
async function triggerSecondarySyncs (req) {
  if (config.get('isUserMetadataNode')) return
  try {
    if (!req.session.nodeIsPrimary || !req.session.creatorNodeEndpoints || !Array.isArray(req.session.creatorNodeEndpoints)) return
    const [primary, ...secondaries] = req.session.creatorNodeEndpoints

    await Promise.all(secondaries.map(async secondary => {
      if (!secondary || !_isFQDN(secondary)) return
      const axiosReq = {
        baseURL: secondary,
        url: '/sync',
        method: 'post',
        data: {
          wallet: [req.session.wallet],
          creator_node_endpoint: primary,
          immediate: false
        }
      }
      return axios(axiosReq)
    }))
  } catch (e) {
    req.logger.error(`Trigger secondary syncs ${req.session.wallet}`, e.message)
  }
}

/** Retrieves current FQDN registered on-chain with node's owner wallet. */
async function _getOwnEndpoint (req) {
  if (config.get('isUserMetadataNode')) throw new Error('Not available for userMetadataNode')
  const libs = req.app.get('audiusLibs')

  let spOwnerWallet
  if (config.get('spOwnerWallet')) {
    spOwnerWallet = config.get('spOwnerWallet')
  } else if (config.get('ethWallets') && config.get('spOwnerWalletIndex') && Array.isArray(config.get('ethWallets')) && config.get('ethWallets').length > config.get('spOwnerWalletIndex')) {
    spOwnerWallet = config.get('ethWallets')[config.get('spOwnerWalletIndex')]
  } else {
    throw new Error('Must provide either spOwnerWallet or ethWallets and spOwnerWalletIndex config vars.')
  }

  const spInfo = await libs.ethContracts.ServiceProviderFactoryClient.getServiceProviderInfoFromAddress(
    spOwnerWallet,
    'creator-node'
  )

  // confirm on-chain endpoint exists and is valid FQDN
  if (!spInfo ||
      spInfo.length === 0 ||
      !spInfo[0].hasOwnProperty('endpoint') ||
      (spInfo[0]['endpoint'] && !_isFQDN(spInfo[0]['endpoint']))) {
    throw new Error('fail')
  }
  return spInfo[0]['endpoint']
}

/** Get all creator node endpoints for user by wallet from discprov. */
async function _getCreatorNodeEndpoints (req, wallet) {
  if (config.get('isUserMetadataNode')) throw new Error('Not available for userMetadataNode')
  const libs = req.app.get('audiusLibs')

  req.logger.info(`Starting _getCreatorNodeEndpoints for wallet ${wallet}`)
  const start = Date.now()

  // Poll discprov until it has indexed provided blocknumber to ensure up-to-date user data.
  let user = null
  const { blockNumber } = req.body
  if (blockNumber) {
    let discprovBlockNumber = -1
    const start2 = Date.now()

    const maxRetries = 30
    for (let retry = 1; retry <= maxRetries; retry++) {
      req.logger.info(`_getCreatorNodeEndpoints retry #${retry}/${maxRetries} || time from start: ${Date.now() - start2} discprovBlockNumber ${discprovBlockNumber} || blockNumber ${blockNumber}`)
      try {
        const fetchedUser = await libs.User.getUsers(1, 0, null, wallet)
        if (!fetchedUser || fetchedUser.length === 0 || !fetchedUser[0].hasOwnProperty('blocknumber') || !fetchedUser[0].hasOwnProperty('track_blocknumber')) {
          throw new Error('Missing or malformatted user fetched from discprov.')
        }
        user = fetchedUser
        discprovBlockNumber = Math.max(user[0].blocknumber, user[0].track_blocknumber)
        if (discprovBlockNumber >= blockNumber) {
          break
        }
      } catch (e) { // Ignore all errors until maxRetries exceeded.
        req.logger.info(e)
      }
      await utils.timeout(3000)
      req.logger.info(`_getCreatorNodeEndpoints AFTER TIMEOUT retry #${retry}/${maxRetries} || time from start: ${Date.now() - start2} discprovBlockNumber ${discprovBlockNumber} || blockNumber ${blockNumber}`)
    }

    if (discprovBlockNumber < blockNumber) {
      throw new Error(`Discprov still outdated after ${maxRetries}. Discprov blocknumber ${discprovBlockNumber} requested blocknumber ${blockNumber}`)
    }
    if (!user) {
      throw new Error(`Failed to retrieve user from discprov after ${maxRetries} retries. Aborting.`)
    }
  } else {
    req.logger.info(`_getCreatorNodeEndpoints || no blockNumber passed, fetching user without retries.`)
    user = await libs.User.getUsers(1, 0, null, wallet)
  }

  if (!user || user.length === 0 || !user[0].hasOwnProperty('creator_node_endpoint')) {
    throw new Error(`Invalid return data from discovery provider for user with wallet ${wallet}.`)
  }
  const endpoint = user[0]['creator_node_endpoint']
  const resp = endpoint ? endpoint.split(',') : []

  req.logger.info(`_getCreatorNodeEndpoints route time ${Date.now() - start}`)
  return resp
}

// Regular expression to check if endpoint is a FQDN. https://regex101.com/r/kIowvx/2
function _isFQDN (url) {
  let FQDN = new RegExp(/(?:^|[ \t])((https?:\/\/)?(?:localhost|[\w-]+(?:\.[\w-]+)+)(:\d+)?(\/\S*)?)/gm)
  return FQDN.test(url)
}

module.exports = { authMiddleware, ensurePrimaryMiddleware, triggerSecondarySyncs, syncLockMiddleware }
