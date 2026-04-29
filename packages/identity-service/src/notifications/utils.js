const moment = require('moment-timezone')
const Hashids = require('hashids/cjs')

const models = require('../models')
const config = require('../config')
const { logger } = require('../logging')
const audiusLibsWrapper = require('../audiusLibsInstance')

// default configs
const startBlock = config.get('notificationStartBlock')
const startSlot = config.get('solanaNotificationStartSlot')
// Number of tracks to fetch for new listens on each poll

/**
 * For any users missing blockchain id, here we query the values from discprov and fill them in
 */
async function updateBlockchainIds() {
  const { discoveryProvider } = audiusLibsWrapper.getAudiusLibs()

  const usersWithoutBlockchainId = await models.User.findAll({
    attributes: ['walletAddress', 'handle'],
    where: { blockchainUserId: null }
  })
  for (const updateUser of usersWithoutBlockchainId) {
    try {
      const walletAddress = updateUser.walletAddress
      logger.info(`Updating user with wallet ${walletAddress}`)
      const respUsers = await discoveryProvider._makeRequest({
        endpoint: 'users',
        queryParams: { wallet: walletAddress }
      })
      if (respUsers.length === 1) {
        const respUser = respUsers[0]
        const missingUserId = respUser.user_id
        const missingHandle = respUser.handle
        const updateObject = { blockchainUserId: missingUserId }

        if (updateUser.handle === null) {
          updateObject.handle = missingHandle
        }
        await models.User.update(updateObject, { where: { walletAddress } })
        logger.info(
          `Updated wallet ${walletAddress} to blockchainUserId: ${missingUserId}, ${updateUser.handle}`
        )
        continue
      }
      for (const respUser of respUsers) {
        // Only update if handles match
        if (respUser.handle === updateUser.handle) {
          const missingUserId = respUser.user_id
          await models.User.update(
            { blockchainUserId: missingUserId },
            { where: { walletAddress, handle: updateUser.handle } }
          )
          logger.info(
            `Updated wallet ${walletAddress} to blockchainUserId: ${missingUserId}, ${updateUser.handle}`
          )
          const userSettings = await models.UserNotificationSettings.findOne({
            where: { userId: missingUserId }
          })
          if (userSettings == null) {
            await models.UserNotificationSettings.create({
              userId: missingUserId
            })
          }
        }
      }
    } catch (e) {
      logger.error('Error in updateBlockchainIds', e)
    }
  }
}

/* We use a JS implementation of the the HashIds protocol (http://hashids.org)
 * to obfuscate our monotonically increasing int IDs as
 * strings in our consumable API.
 *
 * Discovery provider uses a python implementation of the same protocol
 * to encode and decode IDs.
 */
const HASH_SALT = 'azowernasdfoia'
const MIN_LENGTH = 5
const hashids = new Hashids(HASH_SALT, MIN_LENGTH)

/** Encodes an int ID into a string. */
function encodeHashId(id) {
  return hashids.encode([id])
}

/** Decodes a string id into an int. Returns null if an invalid ID. */
function decodeHashId(id) {
  const ids = hashids.decode(id)
  if (!ids.length) return null
  return ids[0]
}

module.exports = {
  encodeHashId,
  decodeHashId,
  updateBlockchainIds
}
