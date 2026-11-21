'use strict'
const models = require('../../src/models')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'UserEvents',
        'hasSentDownloadAppEmail',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        { transaction }
      )
      await queryInterface.addColumn(
        'UserEvents',
        'hasSignedInNativeMobile',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        { transaction }
      )

      const users = await models.User.findAll({
        attributes: ['walletAddress'],
        transaction
      })

      const toInsert = users.map(({ dataValues }) => ({
        walletAddress: dataValues.walletAddress,
        needsRecoveryEmail: false,
        hasSignedInNativeMobile: true,
        hasSentDownloadAppEmail: false
      }))

      await models.UserEvents.bulkCreate(toInsert, {
        transaction,
        ignoreDuplicates: true
      })
      await models.UserEvents.update(
        {
          needsRecoveryEmail: false,
          hasSignedInNativeMobile: true,
          hasSentDownloadAppEmail: false
        },
        { where: {}, transaction }
      )
    })
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn(
        'UserEvents',
        'hasSentDownloadAppEmail',
        { transaction }
      )
      await queryInterface.removeColumn(
        'UserEvents',
        'hasSignedInNativeMobile',
        { transaction }
      )
    })
  }
}
