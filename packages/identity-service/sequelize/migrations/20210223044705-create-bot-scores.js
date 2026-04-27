'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .createTable('BotScores', {
        id: {
          allowNull: false,
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        walletAddress: {
          allowNull: false,
          type: Sequelize.STRING
        },
        recaptchaScore: {
          allowNull: false,
          type: Sequelize.DECIMAL
        },
        recaptchaContext: {
          allowNull: false,
          type: Sequelize.STRING
        },
        recaptchaHostname: {
          allowNull: false,
          type: Sequelize.STRING
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
      .then(() => queryInterface.addIndex('BotScores', ['walletAddress']))
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface
      .removeIndex('BotScores', ['walletAddress'])
      .then(() => queryInterface.dropTable('BotScores'))
  }
}
