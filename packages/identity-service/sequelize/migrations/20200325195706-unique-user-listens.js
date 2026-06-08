'use strict'

/**
 * Makes entries in the user list table unique on track id and user id.
 * Deletes currently conflicting entries. We aren't sure how these arose in the
 * first place.
 */
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
    // return new Promise(resolve => resolve())
    return queryInterface.removeConstraint(
      'UserTrackListens',
      'unique_on_user_id_and_track_id'
    )
  }
}
