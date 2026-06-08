'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addIndex('SolanaNotifications', ['userId'], {
        transaction,
        name: 'idx_solana_notifications_user_id'
      })
      await queryInterface.addIndex('SolanaNotificationActions', ['slot'], {
        transaction,
        name: 'idx_solana_notification_actions_slot'
      })
      await queryInterface.addIndex(
        'SolanaNotificationActions',
        ['notificationId'],
        {
          transaction,
          name: 'idx_solana_notification_actions_notif_id'
        }
      )
      await queryInterface.addIndex(
        'SolanaNotificationActions',
        ['notificationId', 'actionEntityType', 'actionEntityId', 'slot'],
        {
          transaction,
          name: 'idx_solana_notification_actions_all'
        }
      )
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex(
        'SolanaNotifications',
        'idx_solana_notifications_user_id',
        { transaction }
      )
      await queryInterface.removeIndex(
        'SolanaNotificationActions',
        'idx_solana_notification_actions_slot',
        { transaction }
      )
      await queryInterface.removeIndex(
        'SolanaNotificationActions',
        'idx_solana_notification_actions_notif_id',
        { transaction }
      )
      await queryInterface.removeIndex(
        'SolanaNotificationActions',
        'idx_solana_notification_actions_all',
        { transaction }
      )
    })
  }
}
