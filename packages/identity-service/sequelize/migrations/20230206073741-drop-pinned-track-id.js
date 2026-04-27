'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('SocialHandles', 'pinnedTrackId')
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('SocialHandles', 'pinnedTrackId', {
      type: Sequelize.INTEGER
    })
  }
}
