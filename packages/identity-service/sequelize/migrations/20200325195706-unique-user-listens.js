'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize
      .query(
        `
      DELETE FROM "UserTrackListens"
      WHERE "id" in (
        SELECT "id" FROM (
          SELECT *,
          ROW_NUMBER() OVER (PARTITION BY "userId", "trackId" ORDER BY "userId", "trackId") as rowNumber
          FROM "UserTrackListens"
        ) A
        WHERE A.rowNumber > 1
    )`
      )
      .then(() => {
        return queryInterface.addConstraint(
          'UserTrackListens',
          ['userId', 'trackId'],
          {
            type: 'unique',
            name: 'unique_on_user_id_and_track_id'
          }
        )
      })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeConstraint(
      'UserTrackListens',
      'unique_on_user_id_and_track_id'
    )
  }
}
