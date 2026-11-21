const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid')
const config = require('../config')
const {
  handleResponse,
  successResponse,
  errorResponseForbidden,
  errorResponseServerError
} = require('../apiHelpers')
const authMiddleware = require('../authMiddleware')
const { logger } = require('../logging')

const plaidClient = new PlaidApi(new Configuration())

module.exports = function (app) {
  app.get(
    '/create_link_token',
    authMiddleware,
    handleResponse(async (req, res) => {
      const { handle } = req.user
      try {
        const response = await plaidClient.linkTokenCreate({
          client_id: config.get('plaidClientId'),
          secret: config.get('plaidSecret'),
          user: {
            client_user_id: handle
          },
          country_codes: ['US'],
          language: 'en',
          client_name: 'Audius',
          products: ['identity_verification'],
          identity_verification: {
            template_id: config.get('plaidTemplateId')
          }
        })
        return successResponse({ linkToken: response.data.link_token })
      } catch (error) {
        logger.error('Error creating link token:', error)
        return errorResponseServerError({
          message: 'Could not create link token'
        })
      }
    })
  )
}
