'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Notifications', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      type: {
        type: Sequelize.ENUM(
          'Follow',
          'RepostTrack',
          'RepostPlaylist',
          'RepostAlbum',
          'FavoriteTrack',
          'FavoritePlaylist',
          'FavoriteAlbum',
          'CreateTrack',
          'CreatePlaylist',
          'CreateAlbum',
          'Announcement',
          'MilestoneListen',
          'MilestoneRepost',
          'MilestoneFavorite',
          'MilestoneFollow'
        )
      },
      isRead: {
        type: Sequelize.BOOLEAN
      },
      isHidden: {
        type: Sequelize.BOOLEAN
      },
      userId: {
        type: Sequelize.INTEGER
      },
      entityId: {
        allowNull: true,
        type: Sequelize.INTEGER
      },
      blocknumber: {
        type: Sequelize.INTEGER
      },
      timestamp: {
        type: Sequelize.DATE
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
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Notifications')
  }
}
