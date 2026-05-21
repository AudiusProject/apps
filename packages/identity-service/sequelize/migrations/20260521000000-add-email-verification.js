'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'isEmailVerified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
    await queryInterface.addColumn('Users', 'emailVerificationToken', {
      type: Sequelize.STRING,
      allowNull: true
    })
    await queryInterface.addColumn('Users', 'emailVerificationTokenCreatedAt', {
      type: Sequelize.DATE,
      allowNull: true
    })
    await queryInterface.addIndex('Users', ['emailVerificationToken'], {
      name: 'users_email_verification_token_idx'
    })
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      'Users',
      'users_email_verification_token_idx'
    )
    await queryInterface.removeColumn(
      'Users',
      'emailVerificationTokenCreatedAt'
    )
    await queryInterface.removeColumn('Users', 'emailVerificationToken')
    await queryInterface.removeColumn('Users', 'isEmailVerified')
  }
}
