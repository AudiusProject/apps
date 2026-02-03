const config = require('../config')
const {
  handleResponse,
  successResponse,
  errorResponseServerError
} = require('../apiHelpers')
const authMiddleware = require('../authMiddleware')
const { logger } = require('../logging')

module.exports = function (app) {
  // Route to create a session token/config for identity verification
  app.get(
    '/create_session_token',
    authMiddleware,
    handleResponse(async (req, res) => {
      const { handle } = req.user
      try {
        // Persona embedded flow requires templateId, referenceId, and environmentId
        // We return these as a "sessionToken" object for the frontend
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

