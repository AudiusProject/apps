'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'ALTER TABLE "UserNotificationSettings" ALTER "emailFrequency" set default \'weekly\'::"enum_UserNotificationSettings_emailFrequency"',
        { transaction }
      )
      await queryInterface.sequelize.query(
        'UPDATE "UserNotificationSettings" SET "emailFrequency" = \'weekly\' WHERE "emailFrequency" = \'daily\'',
        { transaction }
      )
    })
  },

  // Only the default is restored. Users moved from daily to weekly can't be
  // told apart from users who picked weekly, so the update is not reversed.
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'ALTER TABLE "UserNotificationSettings" ALTER "emailFrequency" set default \'daily\'::"enum_UserNotificationSettings_emailFrequency"',
        { transaction }
      )
    })
  }
}
