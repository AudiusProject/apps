'use strict'
module.exports = (sequelize, DataTypes) => {
  const UserNotificationMobileSettings = sequelize.define(
    'UserNotificationMobileSettings',
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
      remixes: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      messages: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      comments: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      mentions: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      reactions: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {}
  )

  return UserNotificationMobileSettings
}
