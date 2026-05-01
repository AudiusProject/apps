'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addIndex('NotificationActions', ['notificationId'], {
        transaction
      })
      await queryInterface.addIndex('Notifications', ['userId'], {
        transaction
      })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface
      .removeIndex('NotificationActions', ['notificationId'])
      .then(() => queryInterface.removeIndex('Notifications', ['userId']))
  }
}
