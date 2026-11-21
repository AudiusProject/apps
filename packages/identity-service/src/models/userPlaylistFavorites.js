'use strict'
module.exports = (sequelize, DataTypes) => {
  const UserPlaylistFavorites = sequelize.define(
    'UserPlaylistFavorites',
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      favorites: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE
      }
    },
    {}
  )
  return UserPlaylistFavorites
}
