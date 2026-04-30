'use strict'

module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "users_handle_idx" on "Users" ("handle")`,
        { transaction }
      )
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "cognito_flows_handle_idx" on "CognitoFlows" ("handle")`,
        { transaction }
      )
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "twitter_users_screen_name_idx" ON "TwitterUsers"(("twitterProfile"->>'screen_name'))`,
        { transaction }
      )
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "instagram_users_profile_username_idx" ON "InstagramUsers"(("profile"->>'username'))`,
        { transaction }
      )
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS "notification_emails_user_id_idx" ON "NotificationEmails" ("userId");`,
        { transaction }
      )
    })
  },

  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "users_handle_idx"`,
        { transaction }
      )
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "cognito_flows_handle_idx"`,
        { transaction }
      )
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "twitter_users_screen_name_idx"`,
        { transaction }
      )
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "instagram_users_profile_username_idx"`,
        { transaction }
      )
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "notification_emails_user_id_idx"`,
        { transaction }
      )
    })
  }
}
