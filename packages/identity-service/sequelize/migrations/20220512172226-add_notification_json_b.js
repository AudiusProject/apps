'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    // This migration requires each enum add in it's own query, otherwise Sequelize complains
    // that this can't be performed within a transaction
    return queryInterface.sequelize
      .query(`ALTER TYPE "enum_SolanaNotifications_type" ADD VALUE 'TipSend'`)
      .then(() =>
        queryInterface.sequelize.query(
          `ALTER TYPE "enum_SolanaNotifications_type" ADD VALUE 'TipReceive'`
        )
      )
      .then(() =>
        queryInterface.sequelize.query(
          `ALTER TYPE "enum_SolanaNotifications_type" ADD VALUE 'Reaction'`
        )
      )
      .then(() =>
        queryInterface.sequelize.query(
          `ALTER TYPE "enum_SolanaNotifications_type" ADD VALUE 'SupporterRankUp'`
        )
      )
      .then(() =>
        queryInterface.sequelize.query(
          `ALTER TYPE "enum_SolanaNotifications_type" ADD VALUE 'SupportingRankUp'`
        )
      )
      .then(() =>
        queryInterface.addColumn('SolanaNotifications', 'metadata', {
          type: Sequelize.JSONB,
          allowNull: true
        })
      )
      .then(() =>
        queryInterface.sequelize.query(
          `CREATE INDEX IF NOT EXISTS "solana_notifications_metadata_tip_tx_signature_idx" ON "SolanaNotifications"(("metadata"->>'tipTxSignature'))`
        )
      )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS "solana_notifications_metadata_tip_tx_signature_idx";',
        { transaction }
      )

      // Recreate the old enum:

      // Create a new enum
      await queryInterface.sequelize.query(
        `
        CREATE TYPE "enum_SolanaNotifications_type_new"
        AS ENUM ('ChallengeReward', 'MilestoneListen');
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

      await queryInterface.removeColumn('SolanaNotifications', 'metadata', {
        transaction
      })
    })
  }
}
