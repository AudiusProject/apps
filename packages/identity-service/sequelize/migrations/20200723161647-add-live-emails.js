'use strict'
const models = require('../../src/models')

module.exports = {
  up: (queryInterface, Sequelize) => {
    // Add 'live' to "NotificatiionEmails" "emailFrequency"
    return (
      queryInterface.sequelize
        .query(
          'ALTER TYPE "enum_NotificationEmails_emailFrequency" ADD VALUE \'live\''
        )
        // Do nothing if it already exists
        // Deleting enum values is not possible w/o root db access, so in the case the enum already exists
        // just continue on. If for some reason this threw but it didn't exist, we would fail at the next step
        // not continue
        .catch(() => {})
        // Change the default to 'live'
        .finally(() => {
          return queryInterface.sequelize.query(
            'ALTER TABLE "NotificationEmails" ALTER "emailFrequency" set default \'live\'::"enum_NotificationEmails_emailFrequency"'
          )
        })
        // Add 'live' to "UserNotificationSettings" "emailFrequency"
        .then(() => {
          return queryInterface.sequelize.query(
            'ALTER TYPE "enum_UserNotificationSettings_emailFrequency" ADD VALUE \'live\''
          )
        })
        // Do nothing if it already exists
        // Deleting enum values is not possible w/o root db access, so in the case the enum already exists
        // just continue on. If for some reason this threw but it didn't exist, we would fail at the next step
        // not continue
        .catch(() => {})
        // Change the default ot 'live'
        .finally(() => {
          return queryInterface.sequelize.query(
            'ALTER TABLE "UserNotificationSettings" ALTER "emailFrequency" set default \'live\'::"enum_UserNotificationSettings_emailFrequency"'
          )
        })
        // Set all the users who have the default (daily) to live
        .then(() => {
          return models.UserNotificationSettings.update(
            {
              emailFrequency: 'live'
            },
            {
              where: { emailFrequency: 'daily' }
            }
          )
        })
    )
  },

  down: (queryInterface, Sequelize) => {
    // Set all the users who have the default (live) to daily
    return (
      models.UserNotificationSettings.update(
        {
          emailFrequency: 'daily'
        },
        {
          where: { emailFrequency: 'live' }
        }
      )
        // Change the default back to 'daily'
        .then(() => {
          return queryInterface.sequelize.query(
            'ALTER TABLE "NotificationEmails" ALTER "emailFrequency" set default \'daily\'::"enum_NotificationEmails_emailFrequency"'
          )
        })
        // Normal users can't do this!
        // Delete 'live' from "NotificationEmails" "emailFrequency"
        // .then(() => {
        //   const query = 'DELETE FROM pg_enum ' +
        //   'WHERE enumlabel = \'live\' ' +
        //   'AND enumtypid = ( SELECT oid FROM pg_type WHERE typname = \'enum_NotificationEmails_emailFrequency\')'
        //   return queryInterface.sequelize.query(query)
        // })
        // Change the default back to 'daily'
        .then(() => {
          return queryInterface.sequelize.query(
            'ALTER TABLE "UserNotificationSettings" ALTER "emailFrequency" set default \'daily\'::"enum_UserNotificationSettings_emailFrequency"'
          )
        })
    )
    // Normal users can't do this!
    // Delete 'live' from "NotificationEmails" "emailFrequency"
    // .then(() => {
    //   const query = 'DELETE FROM pg_enum ' +
    //   'WHERE enumlabel = \'live\' ' +
    //   'AND enumtypid = ( SELECT oid FROM pg_type WHERE typname = \'enum_UserNotificationSettings_emailFrequency\')'
    //   return queryInterface.sequelize.query(query)
    // })
  }
}
