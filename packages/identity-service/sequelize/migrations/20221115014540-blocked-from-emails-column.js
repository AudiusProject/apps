'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Users', 'isBlockedFromEmails', {
      type: Sequelize.BOOLEAN,
      allowNull: true
    })
  },

  down: (queryInterface) => {
    return queryInterface.removeColumn('Users', 'isBlockedFromEmails')
  }
}
