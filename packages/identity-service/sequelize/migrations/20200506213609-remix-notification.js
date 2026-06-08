'use strict'
const models = require('../../src/models')

/**
 * Update the `UserNotificationBrowserSettings` table to add column `remixes`
 * Update the `UserNotificationMobileSettings` table to add column `remixes`
 * Update the enum `enum_Notifications_type` used in table `Notifications` column `type`
 *   Add the values `RemixCreate` and `RemixCosign`
 */

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'UserNotificationBrowserSettings',
        'remixes',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        { transaction }
      )
      await queryInterface.addColumn(
        'UserNotificationMobileSettings',
        'remixes',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        { transaction }
      )
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Notifications_type" ADD VALUE 'RemixCreate'`
      )
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_Notifications_type" ADD VALUE 'RemixCosign'`
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
      'MilestoneFollow'
    ]

    return queryInterface.sequelize.transaction(async (transaction) => {
      // Create a copy of the type
      await queryInterface.removeColumn(
        'UserNotificationBrowserSettings',
        'remixes',
        { transaction }
      )
      await queryInterface.removeColumn(
        'UserNotificationMobileSettings',
        'remixes',
        { transaction }
      )
      await models.Notification.destroy({
        where: {
          type: { [models.Sequelize.Op.in]: ['RemixCreate', 'RemixCosign'] }
        }
      })

      await queryInterface.sequelize.query(
        `
          CREATE TYPE "${newEnumName}"
            AS ENUM ('${prevValues.join("', '")}')
        `,
        { transaction }
      )
      // Change column type to the new ENUM TYPE
      await queryInterface.sequelize.query(
        `
        ALTER TABLE "${tableName}"
          ALTER COLUMN ${columnName}
            TYPE "${newEnumName}"
            USING ("${columnName}"::text::"${newEnumName}")
      `,
        { transaction }
      )
      // Drop old ENUM
      await queryInterface.sequelize.query(
        `
        DROP TYPE "${enumName}"
      `,
        { transaction }
      )
      // Rename new ENUM name
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
