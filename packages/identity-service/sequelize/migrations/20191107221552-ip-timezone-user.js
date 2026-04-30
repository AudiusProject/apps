'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .addColumn('Users', 'IP', {
        type: Sequelize.STRING,
        allowNull: true
      })
      .then(() =>
        queryInterface.addColumn('Users', 'timezone', {
          type: Sequelize.STRING,
          allowNull: true
        })
      )
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface
      .removeColumn('Users', 'IP')
      .then(() => queryInterface.removeColumn('Users', 'timezone'))
  }
}
