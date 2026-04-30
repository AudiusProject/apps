'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .removeColumn('UserNotificationBrowserSettings', 'messages')
      .then(() =>
        queryInterface.addColumn(
          'UserNotificationBrowserSettings',
          'messages',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false
          }
        )
      )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface
      .removeColumn('UserNotificationBrowserSettings', 'messages')
      .then(() =>
        queryInterface.addColumn(
          'UserNotificationBrowserSettings',
          'messages',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
          }
        )
      )
  }
}
