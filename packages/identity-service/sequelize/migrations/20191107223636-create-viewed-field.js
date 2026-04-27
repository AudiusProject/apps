'use strict'
const models = require('../../src/models')

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'Notifications',
        'isViewed',
        {
          type: Sequelize.BOOLEAN,
          allowNull: true
        },
        { transaction }
      )

      await models.Notification.update(
        {
          isViewed: false
        },
        { transaction, where: { isRead: { [models.Sequelize.Op.ne]: null } } }
      )

      await queryInterface.changeColumn(
        'Notifications',
        'isViewed',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false
        },
        { transaction }
      )
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Notifications', 'isViewed')
  }
}
