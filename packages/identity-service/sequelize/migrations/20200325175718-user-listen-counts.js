'use strict'

/**
 * Adds a 'count' field to UserTrackListens, which signifies the
 * number of times a user has listened to a track
 */
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'UserTrackListens',
        'count',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1
        },
        { transaction }
      )
    })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('UserTrackListens', 'count')
  }
}
