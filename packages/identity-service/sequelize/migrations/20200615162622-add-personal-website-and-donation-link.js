'use strict'

/**
 * Adds 'website' and 'donation' fields to SocialHandles, which
 * signify a personal/artist website and a donation link
 */
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'SocialHandles',
        'website',
        {
          type: Sequelize.STRING,
          allowNull: true
        },
        { transaction }
      )
      await queryInterface.addColumn(
        'SocialHandles',
        'donation',
        {
          type: Sequelize.STRING,
          allowNull: true
        },
        { transaction }
      )
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      queryInterface.removeColumn('SocialHandles', 'website')
      queryInterface.removeColumn('SocialHandles', 'donation')
    })
  }
}
