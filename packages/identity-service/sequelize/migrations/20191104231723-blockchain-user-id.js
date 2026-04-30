'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .addColumn('Users', 'blockchainUserId', {
        type: Sequelize.INTEGER,
        allowNull: true
      })
      .then(() => queryInterface.addIndex('Users', ['walletAddress']))
      .then(() => queryInterface.addIndex('Users', ['blockchainUserId']))
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface
      .removeIndex('Users', ['blockchainUserId'])
      .then(() => queryInterface.removeIndex('Users', ['walletAddress']))
      .then(() => queryInterface.removeColumn('Users', 'blockchainUserId'))
  }
}
