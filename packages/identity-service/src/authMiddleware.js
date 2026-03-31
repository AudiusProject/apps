const axios = require('axios')
const { recoverPersonalSignature } = require('eth-sig-util')
const {
  sendResponse,
  errorResponseBadRequest,
  errorResponseForbidden
} = require('./apiHelpers')

const models = require('./models')

const audiusLibsWrapper = require('./audiusLibsInstance')
const { encodeHashId, decodeHashId } = require('./notifications/utils')

/**
 * Queries for whether the wallet address has privilege to act as actingUserId
 * @param {number} managerWalletAddress
 * @param {number} actingUserId
 * @param {number} authHeaders authentication headers from the manager account
 * @returns boolean whether or not the managagingUserId manages actingUserId
 */
const getManagedUser = async (
  managerWalletAddress,
  actingUserId,
  authHeaders
) => {
  const { discoveryProvider } = audiusLibsWrapper.getAudiusLibs()

  const response = await axios({
    method: 'get',
    url: `${
      discoveryProvider.discoveryProviderEndpoint
    }/v1/full/users/${encodeHashId(actingUserId)}/managers`,
    headers: authHeaders
  })

  if (!Array.isArray(response.data.data) || !(response.data.data.length >= 1)) {
    throw new Error('Unable to retrieve managers from discovery provder')
  }
  const managersList = response.data.data
  if (
    managersList
      .filter((m) => m.grant.is_approved)
      .map((m) => m.manager.erc_wallet.toLowerCase())
      .includes(managerWalletAddress.toLowerCase())
  ) {
    const user = await models.User.findOne({
      where: { blockchainUserId: actingUserId },
      attributes: [
        'id',
        'blockchainUserId',
        'walletAddress',
        'createdAt',
        'handle'
      ]
    })
    return user
  } else {
    throw new Error('Manager not permitted')
  }
}

/**
 * Authentication Middleware
 * 1) Using the `Encoded-Data-Message` & `Encoded-Data-Signature` header recover the wallet address
 * 2) If a user in the `Users` table with the `walletAddress` value, attach that user to the request
 * 3) Else query the discovery provider for the user's blockchain userId w/ the wallet address & attach to query
 */
async function authMiddleware(req, res, next) {
  try {
    const encodedDataMessage = req.get('Encoded-Data-Message')
    const signature = req.get('Encoded-Data-Signature')
    const actingUserId = Number.parseInt(req.query.user_id, 10)

    if (!encodedDataMessage) throw new Error('[Error]: Encoded data missing')
    if (!signature) throw new Error('[Error]: Encoded data signature missing')

    const walletAddress = recoverPersonalSignature({
      data: encodedDataMessage,
      sig: signature
    })

    let user = await models.User.findOne({
      where: { walletAddress },
      attributes: [
        'id',
        'blockchainUserId',
        'walletAddress',
        'createdAt',
        'handle'
      ]
    })
    // We are managing someone else
    if (actingUserId && actingUserId !== user.blockchainUserId) {
      try {
        const actingUser = await getManagedUser(walletAddress, actingUserId, {
          'Encoded-Data-Message': encodedDataMessage,
          'Encoded-Data-Signature': signature
        })
        req.user = actingUser
      } catch (err) {
        const errorResponse = errorResponseForbidden(
          `[Error]: The wallet address is not permitted to act as user id ${err}`
        )
        return sendResponse(req, res, errorResponse)
      }
      next()
    } else {
      if (!user)
        throw new Error(
          `[Error]: no user found for wallet address ${walletAddress}`
        )

      // This overwrites any provisionally set handles (b/c blockchainUserId is never set with those),
      // ensuring that the user.handle always represents the latest state on chain
      if (!user.blockchainUserId || !user.handle) {
        try {
          const res = await req.app.get('audiusSdk').full.users.getUserAccount({
            wallet: walletAddress,
            encodedDataMessage,
            encodedDataSignature: signature
          })
          const discprovUser = res.data.user
          const userId = decodeHashId(discprovUser.id)
          const handle = discprovUser.handle
          user = await user.update({
            blockchainUserId: userId,
            handle,
            isGuest: !handle
          })
        } catch (e) {
          req.logger.error(e, 'Failed to update blockchainUserId/handle')
        }
      }
      req.user = user
      next()
    }
  } catch (err) {
    const errorResponse = errorResponseBadRequest(
      `[Error]: The wallet address is not associated with a user id ${err}`
    )
    return sendResponse(req, res, errorResponse)
  }
}

/**
 * Parameterized version of authentication middleware
 * @param {{
 *  shouldRespondBadRequest, whether or not to return server error on auth failure
 * }: {
 *  shouldRespondBadRequest: boolean
 * }}
 * @returns function `authMiddleware`
 */
const parameterizedAuthMiddleware = ({ shouldRespondBadRequest }) => {
  return async (req, res, next) => {
    try {
      const encodedDataMessage = req.get('Encoded-Data-Message')
      const signature = req.get('Encoded-Data-Signature')

      if (!encodedDataMessage) throw new Error('[Error]: Encoded data missing')
      if (!signature) throw new Error('[Error]: Encoded data signature missing')

      const walletAddress = recoverPersonalSignature({
        data: encodedDataMessage,
        sig: signature
      })
      let user = await models.User.findOne({
        where: { walletAddress },
        attributes: [
          'id',
          'blockchainUserId',
          'walletAddress',
          'createdAt',
          'handle'
        ]
      })
      if (!user)
        throw new Error(
          `[Error]: no user found for wallet address ${walletAddress}`
        )

      if (!user.blockchainUserId || !user.handle) {
        try {
          const res = await req.app.get('audiusSdk').full.users.getUserAccount({
            wallet: walletAddress,
            encodedDataMessage,
            encodedDataSignature: signature
          })
          const discprovUser = res.data.user
          const userId = decodeHashId(discprovUser.id)
          const handle = discprovUser.handle
          user = await user.update({
            blockchainUserId: userId,
            handle,
            isGuest: !handle
          })
        } catch (e) {
          req.logger.error(e, 'Failed to update blockchainUserId/handle')
        }
      }
      req.user = user
      next()
    } catch (err) {
      if (shouldRespondBadRequest) {
        const errorResponse = errorResponseBadRequest(
          `[Error]: The wallet address is not associated with a user id: ${err}`
        )
        return sendResponse(req, res, errorResponse)
      }
      next()
    }
  }
}

module.exports = authMiddleware
module.exports.parameterizedAuthMiddleware = parameterizedAuthMiddleware
