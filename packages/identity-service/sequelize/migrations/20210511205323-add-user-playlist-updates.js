'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'UserEvents',
        'playlistUpdates',
        {
          type: Sequelize.JSONB,
          allowNull: true
        },
        { transaction }
      )
    })
  },

  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async () => {
      queryInterface.removeColumn('UserEvents', 'playlistUpdates')
    })
  }
}
