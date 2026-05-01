'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .createTable('UserNotificationSettings', {
        userId: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          allowNull: false
        },
        favorites: {
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
        milestonesAndAchievements: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        followers: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        browserPushNotifications: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        emailFrequency: {
          allowNull: false,
          type: Sequelize.ENUM('daily', 'weekly', 'off'),
          defaultValue: 'daily'
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      })
      .then(() =>
        queryInterface.addIndex('UserNotificationSettings', ['userId'])
      )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface
      .removeIndex('UserNotificationSettings', ['userId'])
      .then(() => queryInterface.dropTable('UserNotificationSettings'))
  }
}
