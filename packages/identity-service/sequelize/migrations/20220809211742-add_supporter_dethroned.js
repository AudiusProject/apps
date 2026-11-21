'use strict'

module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.query(
      `ALTER TYPE "enum_SolanaNotifications_type" ADD VALUE 'SupporterDethroned'`
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
        DELETE FROM "SolanaNotifications"
        WHERE "type" = 'SupporterDethroned';
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
        CREATE TYPE "enum_SolanaNotifications_type_new"
        AS ENUM ('ChallengeReward', 'MilestoneListen', 'TipSend', 'TipReceive', 'Reaction', 'SupporterRankUp', 'SupportingRankUp');
      `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "SolanaNotifications"
        ALTER COLUMN "type"
          TYPE "enum_SolanaNotifications_type_new"
          USING ("type"::text::"enum_SolanaNotifications_type_new");
    `,
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
        DROP TYPE "enum_SolanaNotifications_type";
      `,
        { transaction }
      )

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
