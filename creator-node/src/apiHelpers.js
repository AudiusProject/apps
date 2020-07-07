const config = require('./config')
const Web3 = require('web3')
const web3 = new Web3()

const { requestNotExcludedFromLogging } = require('./logging')
const versionInfo = require('../.version.json')

module.exports.handleResponse = (func) => {
  return async function (req, res, next) {
    try {
      const resp = await func(req, res, next)

      if (!isValidResponse(resp)) {
        throw new Error('Invalid response returned by function')
      }

      sendResponse(req, res, resp)
      next()
    } catch (error) {
      console.error('HandleResponse', error)
      next(error)
    }
  }
}

const sendResponse = module.exports.sendResponse = (req, res, resp) => {
  let logger = req.logger.child({
    statusCode: resp.statusCode
  })
  if (resp.statusCode === 200) {
    if (requestNotExcludedFromLogging(req.originalUrl)) {
      logger.info('Success')
    }
  } else {
    logger = logger.child({
      errorMessage: resp.object.error
    })
    if (req && req.body) {
      logger.info('Error processing request:', resp.object.error, '|| Request Body:', req.body)
    } else {
      logger.info('Error processing request:', resp.object.error)
    }
  }

  // set custom CORS headers that's required if you want to response
  // headers through axios
  res.set('Access-Control-Expose-Headers', 'CN-Request-ID')

  res.status(resp.statusCode).send(resp.object)
}

const isValidResponse = module.exports.isValidResponse = (resp) => {
  if (!resp || !resp.statusCode || !resp.object) {
    return false
  }

  return true
}

module.exports.successResponse = (obj = {}) => {
  // generate timestamp
  const timestamp = new Date().toISOString()

  // format data to sign
  let toSign = {
    data: {
      ...obj
    },
    // TODO: remove duplication of obj -- kept for backwards compatibility
    ...obj,
    signer: config.get('delegateOwnerWallet'),
    ...versionInfo,
    timestamp
  }

  const toSignStr = JSON.stringify(_sortKeys(toSign))

  // hash data
  const toSignHash = web3.utils.keccak256(toSignStr)

  // generate signature with hashed data and private key
  const signedResponse = web3.eth.accounts.sign(toSignHash, config.get('delegatePrivateKey'))

  const responseWithSignature = { ...toSign, signature: signedResponse.signature }

  return {
    statusCode: 200,
    object: {
      ...responseWithSignature
    }
  }
}

/**
 * Recover the public wallet address
 * @param {*} data obj with structure {...data, timestamp}
 * @param {*} signature signature generated with signed data
 */
// eslint-disable-next-line no-unused-vars
const recoverWallet = (data, signature) => {
  let structuredData = JSON.stringify(_sortKeys(data))
  const hashedData = web3.utils.keccak256(structuredData)
  const recoveredWallet = web3.eth.accounts.recover(hashedData, signature)

  return recoveredWallet
}

const _sortKeys = x => {
  if (typeof x !== 'object' || !x) { return x }
  if (Array.isArray(x)) { return x.map(_sortKeys) }
  return Object.keys(x).sort().reduce((o, k) => ({ ...o, [k]: _sortKeys(x[k]) }), {})
}

const errorResponse = module.exports.errorResponse = (statusCode, message) => {
  return {
    statusCode: statusCode,
    object: { error: message }
  }
}

module.exports.errorResponseUnauthorized = (message) => {
  return errorResponse(401, message)
}

module.exports.errorResponseForbidden = (message) => {
  return errorResponse(403, message)
}

module.exports.errorResponseBadRequest = (message) => {
  return errorResponse(400, message)
}

module.exports.errorResponseServerError = (message) => {
  return errorResponse(500, message)
}

module.exports.errorResponseNotFound = (message) => {
  return errorResponse(404, message)
}

module.exports.errorResponseSocketTimeout = (socketTimeout) => {
  return errorResponse(500, `${socketTimeout} socket timeout exceeded for request`)
}
