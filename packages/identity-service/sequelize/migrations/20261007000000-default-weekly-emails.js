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

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'ALTER TABLE "UserNotificationSettings" ALTER "emailFrequency" set default \'daily\'::"enum_UserNotificationSettings_emailFrequency"',
        { transaction }
      )
    })
  }
}
