'use strict'
module.exports = (sequelize, DataTypes) => {
  const NotificationBrowserSubscription = sequelize.define(
    'NotificationBrowserSubscription',
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      endpoint: {
        allowNull: false,
        type: DataTypes.STRING,
        primaryKey: true
      },
      p256dhKey: {
        allowNull: false,
        type: DataTypes.STRING
      },
      authKey: {
        allowNull: false,
        type: DataTypes.STRING
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {}
  )

  return NotificationBrowserSubscription
}
