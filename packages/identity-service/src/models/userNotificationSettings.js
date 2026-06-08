'use strict'
module.exports = (sequelize, DataTypes) => {
  const UserNotificationSettings = sequelize.define(
    'UserNotificationSettings',
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      favorites: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      milestonesAndAchievements: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      reposts: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      announcements: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      followers: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      browserPushNotifications: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      emailFrequency: {
        allowNull: false,
        type: DataTypes.ENUM('live', 'daily', 'weekly', 'off'),
        defaultValue: 'live'
      }
    },
    {}
  )

  return UserNotificationSettings
}
