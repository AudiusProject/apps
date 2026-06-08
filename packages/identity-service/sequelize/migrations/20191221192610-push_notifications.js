'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const userNotificationMobileSettingsPromise = queryInterface.createTable(
      'UserNotificationMobileSettings',
      {
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        favorites: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        milestonesAndAchievements: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        reposts: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        announcements: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        followers: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      },
      { tableName: 'UserNotificationMobileSettings' }
    )

    const notificationDeviceTokensPromise = queryInterface.createTable(
      'NotificationDeviceTokens',
      {
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        deviceToken: {
          type: Sequelize.STRING,
          allowNull: false,
          primaryKey: true
        },
        deviceType: {
          type: Sequelize.ENUM({
            values: ['ios', 'android']
          }),
          allowNull: false
        },
        awsARN: {
          type: Sequelize.STRING,
          allowNull: true
        },
        enabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }
    )

    return Promise.all([
      userNotificationMobileSettingsPromise,
      notificationDeviceTokensPromise
    ])
  },
  down: (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.dropTable('UserNotificationMobileSettings'),
      queryInterface.dropTable('NotificationDeviceTokens')
    ])
  }
}
