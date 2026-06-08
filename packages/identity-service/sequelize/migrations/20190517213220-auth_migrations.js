'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    const addAuthMigrationsTablePromise = queryInterface.createTable(
      'AuthMigrations',
      {
        handle: {
          type: Sequelize.STRING,
          allowNull: false,
          primaryKey: true
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }
    )
    const addParanoidAuthFieldPromise = queryInterface.addColumn(
      'Authentications',
      'deletedAt',
      { type: Sequelize.DATE, allowNull: true }
    )

    return Promise.all([
      addAuthMigrationsTablePromise,
      addParanoidAuthFieldPromise
    ])
  },
  down: (queryInterface, Sequelize) => {
    const addAuthMigrationsTablePromise =
      queryInterface.dropTable('AuthMigrations')
    const addParanoidAuthFieldPromise = queryInterface.removeColumn(
      'Authentications',
      'deletedAt'
    )

    return Promise.all([
      addAuthMigrationsTablePromise,
      addParanoidAuthFieldPromise
    ])
  }
}
