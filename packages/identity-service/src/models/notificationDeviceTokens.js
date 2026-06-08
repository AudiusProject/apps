'use strict'
module.exports = (sequelize, DataTypes) => {
  const NotificationDeviceToken = sequelize.define(
    'NotificationDeviceToken',
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      deviceToken: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true
      },
      deviceType: {
        type: DataTypes.ENUM({
          values: ['ios', 'android', 'safari']
        }),
        allowNull: false,
        defaultValue: true
      },
      awsARN: {
        type: DataTypes.STRING,
        allowNull: true
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {}
  )

  return NotificationDeviceToken
}
