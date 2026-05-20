'use strict'

module.exports = {
  up: (queryInterface) => {
    return queryInterface.dropTable('Fingerprints')
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface
      .createTable('Fingerprints', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        visitorId: {
          type: Sequelize.STRING,
          allowNull: false
        },
        origin: {
          type: Sequelize.ENUM('web', 'mobile', 'desktop'),
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
      })
      .then(() => queryInterface.addIndex('Fingerprints', ['userId']))
      .then(() => queryInterface.addIndex('Fingerprints', ['visitorId']))
  }
}
