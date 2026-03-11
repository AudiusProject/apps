'use strict'
module.exports = (sequelize, DataTypes) => {
  const Authentication = sequelize.define(
    'Authentication',
    {
      iv: {
        type: DataTypes.STRING,
        allowNull: false
      },
      cipherText: {
        type: DataTypes.STRING,
        allowNull: false
      },
      // the primary key that external queries will interact with this table
      // it's a scrypt hash of the email and password combined with three colons(:)
      // and a fixed iv
      lookupKey: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true
      },
      walletAddress: {
        type: DataTypes.STRING,
        allowNull: true
      },
      skipOtp: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    },
    {
      paranoid: true
    }
  )

  return Authentication
}
