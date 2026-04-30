'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addConstraint('Users', ['walletAddress'], {
      type: 'unique',
      name: 'wallet_address_is_unique'
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeConstraint(
      'Users',
      'wallet_address_is_unique',
      {}
    )
  }
}
