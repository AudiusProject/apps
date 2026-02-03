const config = require('../config')
const {
  handleResponse,
  successResponse,
  errorResponseServerError
} = require('../apiHelpers')
const authMiddleware = require('../authMiddleware')
const { logger } = require('../logging')

module.exports = function (app) {
  app.get(
    '/create_session_token',
    authMiddleware,
    handleResponse(async (req, res) => {
      const { handle } = req.user
      try {
        const sessionToken = {
          templateId: config.get('personaTemplateId'),
          referenceId: handle,
          environmentId: config.get('personaEnvironmentId')
        }
        return successResponse({ sessionToken: JSON.stringify(sessionToken) })
      } catch (error) {
        logger.error('Error creating Persona session token:', error)
        return errorResponseServerError({
          message: 'Could not create Persona session token'
        })
      }
    })
  )
}
