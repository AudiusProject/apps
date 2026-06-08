'use strict'
module.exports = (sequelize, DataTypes) => {
  const PushNotificationBadgeCounts = sequelize.define(
    'PushNotificationBadgeCounts',
    {
      userId: {
        type: DataTypes.INTEGER,
        primaryKey: true
      },
      iosBadgeCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      }
    },
    {}
  )
  PushNotificationBadgeCounts.associate = function (models) {
    // associations can be defined here
  }
  return PushNotificationBadgeCounts
}
