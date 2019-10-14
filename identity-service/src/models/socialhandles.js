'use strict'
module.exports = (sequelize, DataTypes) => {
  const SocialHandles = sequelize.define('SocialHandles', {
    handle: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    twitterHandle: {
      allowNull: true,
      type: DataTypes.STRING
    },
    instagramHandle: {
      allowNull: true,
      type: DataTypes.STRING
    },
    pinnedTrackId: {
      allowNull: true,
      type: DataTypes.INTEGER
    }
  }, {})

  return SocialHandles
}
