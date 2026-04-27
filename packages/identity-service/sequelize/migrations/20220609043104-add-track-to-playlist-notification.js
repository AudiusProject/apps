'use strict'
const models = require('../../src/models')

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Notifications_type" ADD VALUE 'AddTrackToPlaylist'`
      )
      await queryInterface.addColumn(
        'Notifications',
        'metadata',
        {
          type: Sequelize.JSONB,
          allowNull: true
        },
        { transaction }
      )
    })
  },

  down: (queryInterface, Sequelize) => {
    const tableName = 'Notifications'
    const columnName = 'type'
    const enumName = 'enum_Notifications_type'
    const newEnumName = `enum_Notifications_type_new`
    const prevValues = [
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
      'MilestoneFollow',
      'RemixCreate',
      'RemixCosign',
      'TrendingTrack'
    ]

    return queryInterface.sequelize.transaction(async (transaction) => {
      // Delete notifs with this type
      await models.Notification.destroy({
        where: { type: { [models.Sequelize.Op.in]: ['AddTrackToPlaylist'] } }
      })
      // Remove metadata
      await queryInterface.removeColumn('Notifications', 'metadata')

      // Revert enum change
      await queryInterface.sequelize.query(
        `
      CREATE TYPE "${newEnumName}"
        AS ENUM ('${prevValues.join("', '")}')
    `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "${tableName}"
          ALTER COLUMN ${columnName}
            TYPE "${newEnumName}"
            USING ("${columnName}"::text::"${newEnumName}")
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
        DROP TYPE "${enumName}"
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
        ALTER TYPE "${newEnumName}"
          RENAME TO "${enumName}"
      `,
        { transaction }
      )
    })
  }
}
