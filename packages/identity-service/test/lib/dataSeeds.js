const models = require('../../src/models')

/**
 *
 * @param {*} data
 */
const createSeedData = async (data) => {
  if (data.user) {
    await models.User.bulkCreate(
      data.user.map((user, idx) => ({
        email: `mock_email_${idx}@test.com`,
        walletAddress: `0x${idx}`,
        blockchainUserId: idx + 1,
        lastSeenDate: Date.now(),
        ...user
      }))
    )
  }
}

module.exports = { createSeedData }
