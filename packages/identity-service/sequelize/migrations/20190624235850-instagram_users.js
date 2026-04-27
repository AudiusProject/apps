'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .createTable('InstagramUsers', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        profile: {
          type: Sequelize.JSONB,
          allowNull: false,
          unique: false
        },
        accessToken: {
          type: Sequelize.STRING,
          allowNull: false
        },
        uuid: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        blockchainUserId: {
          type: Sequelize.INTEGER,
          allowNull: true
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
      .then(() =>
        queryInterface.addIndex('InstagramUsers', {
          fields: ['uuid'],
          type: 'UNIQUE'
        })
      )
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('InstagramUsers')
  }
}
