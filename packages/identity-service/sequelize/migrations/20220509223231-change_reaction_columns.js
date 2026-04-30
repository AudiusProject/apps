'use strict'

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .renameColumn('Reactions', 'entityId', 'reactedTo')
      .then(() =>
        queryInterface.renameColumn('Reactions', 'entityType', 'reactionType')
      )
      .then(() =>
        queryInterface.renameColumn('Reactions', 'reaction', 'reactionValue')
      )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface
      .renameColumn('Reactions', 'reactedTo', 'entityId')
      .then(() =>
        queryInterface.renameColumn('Reactions', 'reactionType', 'entityType')
      )
      .then(() =>
        queryInterface.renameColumn('Reactions', 'reactionValue', 'reaction')
      )
  }
}
