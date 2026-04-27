'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Users', 'isAbusiveErrorCode', {
      type: Sequelize.STRING,
      defaultValue: null
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Users', 'isAbusiveErrorCode')
  }
}
