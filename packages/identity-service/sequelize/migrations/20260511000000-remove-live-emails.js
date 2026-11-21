'use strict'
const models = require('../../src/models')

module.exports = {
  up: (queryInterface, Sequelize) => {
    return models.UserNotificationSettings.update(
      { emailFrequency: 'daily' },
      { where: { emailFrequency: 'live' } }
    )
      .then(() => {
        return queryInterface.sequelize.query(
          'ALTER TABLE "NotificationEmails" ALTER "emailFrequency" set default \'daily\'::"enum_NotificationEmails_emailFrequency"'
        )
      })
      .then(() => {
        return queryInterface.sequelize.query(
          'UPDATE "NotificationEmails" SET "emailFrequency" = \'daily\' WHERE "emailFrequency" = \'live\''
        )
      })
      .then(() => {
        return queryInterface.sequelize.query(
          'ALTER TABLE "UserNotificationSettings" ALTER "emailFrequency" set default \'daily\'::"enum_UserNotificationSettings_emailFrequency"'
        )
      })
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize
      .query(
        'ALTER TABLE "NotificationEmails" ALTER "emailFrequency" set default \'live\'::"enum_NotificationEmails_emailFrequency"'
      )
      .then(() => {
        return queryInterface.sequelize.query(
          'ALTER TABLE "UserNotificationSettings" ALTER "emailFrequency" set default \'live\'::"enum_UserNotificationSettings_emailFrequency"'
        )
      })
      .then(() => {
        return models.UserNotificationSettings.update(
          { emailFrequency: 'live' },
          { where: { emailFrequency: 'daily' } }
        )
      })
  }
}
