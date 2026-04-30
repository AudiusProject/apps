'use strict'

module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.query(
      `ALTER TYPE "enum_SolanaNotifications_type" ADD VALUE 'SupporterDethroned'`
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // Drop any DethronedNotifs
      await queryInterface.sequelize.query(
        `
        DELETE FROM "SolanaNotifications"
        WHERE "type" = 'SupporterDethroned';
      `,
        { transaction }
      )

      // Recreate the old enum:

      // Create a new enum
      await queryInterface.sequelize.query(
        `
        CREATE TYPE "enum_SolanaNotifications_type_new"
        AS ENUM ('ChallengeReward', 'MilestoneListen', 'TipSend', 'TipReceive', 'Reaction', 'SupporterRankUp', 'SupportingRankUp');
      `,
        { transaction }
      )

      // Set the column to the new enum
      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SolanaNotifications"
        ALTER COLUMN "type"
          TYPE "enum_SolanaNotifications_type_new"
          USING ("type"::text::"enum_SolanaNotifications_type_new");
    `,
        { transaction }
      )

      // Drop old enum
      await queryInterface.sequelize.query(
        `
        DROP TYPE "enum_SolanaNotifications_type";
      `,
        { transaction }
      )

      // Rename new enum
      await queryInterface.sequelize.query(
        `
        ALTER TYPE "enum_SolanaNotifications_type_new"
        RENAME TO "enum_SolanaNotifications_type";
      `,
        { transaction }
      )
    })
  }
}
