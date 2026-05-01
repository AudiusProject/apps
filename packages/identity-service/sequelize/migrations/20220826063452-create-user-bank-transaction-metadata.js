'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'UserBankTransactionMetadata',
        {
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false
          },
          transactionSignature: {
            type: Sequelize.STRING,
            primaryKey: true,
            allowNull: false
          },
          metadata: {
            type: Sequelize.JSONB,
            allowNull: false
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE
          }
        },
        { transaction }
      )
      await queryInterface.addIndex('UserBankTransactionMetadata', ['userId'], {
        transaction,
        name: 'idx_user_bank_transaction_metadata_user_id'
      })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        'UserBankTransactionMetadata',
        'idx_user_bank_transaction_metadata_user_id',
        { transaction }
      )
      await queryInterface.dropTable('UserBankTransactionMetadata', {
        transaction
      })
    })
  }
}
