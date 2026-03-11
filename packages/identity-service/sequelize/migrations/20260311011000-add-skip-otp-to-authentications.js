'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('Authentications', 'skipOtp', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
  },

  down: (queryInterface) => {
    return queryInterface.removeColumn('Authentications', 'skipOtp')
  }
}
