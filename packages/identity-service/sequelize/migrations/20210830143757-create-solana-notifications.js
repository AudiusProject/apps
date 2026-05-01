'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('SolanaNotifications', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID
      },
      type: {
        type: Sequelize.ENUM('ChallengeReward')
      },
      isRead: {
        type: Sequelize.BOOLEAN
      },
      isHidden: {
        type: Sequelize.BOOLEAN
      },
      isViewed: {
        type: Sequelize.BOOLEAN
      },
      userId: {
        type: Sequelize.INTEGER
      },
      entityId: {
        allowNull: true,
        type: Sequelize.INTEGER
      },
      slot: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('SolanaNotifications')
  }
}
