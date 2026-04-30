'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .createTable('NotificationBrowserSubscriptions', {
        userId: {
          allowNull: false,
          type: Sequelize.INTEGER
        },
        endpoint: {
          allowNull: false,
          type: Sequelize.STRING,
          primaryKey: true
        },
        p256dhKey: {
          allowNull: false,
          type: Sequelize.STRING
        },
        authKey: {
          allowNull: false,
          type: Sequelize.STRING
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        enabled: {
          allowNull: false,
          type: Sequelize.BOOLEAN,
          defaultValue: true
        }
      })
      .then(() =>
        queryInterface.sequelize.query(
          'ALTER TYPE "enum_NotificationDeviceTokens_deviceType" ADD VALUE \'safari\''
        )
      )
  },

  down: (queryInterface) => {
    return queryInterface
      .dropTable('NotificationBrowserSubscriptions')
      .then(() => {
        const query =
          'DELETE FROM pg_enum ' +
          "WHERE enumlabel = 'safari' " +
          'AND enumtypid = ( SELECT oid FROM pg_type WHERE typname = "enum_NotificationDeviceTokens_deviceType")'
        return queryInterface.sequelize.query(query)
      })
  }
}
