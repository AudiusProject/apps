'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .removeColumn('UserNotificationMobileSettings', 'messages')
      .then(() =>
        queryInterface.addColumn('UserNotificationMobileSettings', 'messages', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        })
      )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface
      .removeColumn('UserNotificationMobileSettings', 'messages')
      .then(() =>
        queryInterface.addColumn('UserNotificationMobileSettings', 'messages', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        })
      )
  }
}
