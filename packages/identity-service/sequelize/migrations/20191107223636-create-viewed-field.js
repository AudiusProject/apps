'use strict'

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

      // Raw SQL instead of models.Notification.update — the Notification model
      // was removed in #14207 but the Notifications table still exists in the
      // schema, so this migration must keep running on fresh databases.
      await queryInterface.sequelize.query(
        'UPDATE "Notifications" SET "isViewed" = false WHERE "isRead" IS NOT NULL',
        { transaction }
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
