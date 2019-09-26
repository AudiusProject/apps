const models = require('../models')
const { handleResponse, successResponse, errorResponseBadRequest } = require('../apiHelpers')

module.exports = function (app) {
  /**
   * This signup function writes the encryption values from the user's browser(iv, cipherText, lookupKey)
   * into the Authentications table and the email to the Users table. This is the first step in the
   * authentication process
   */
  app.post('/authentication', handleResponse(async (req, res, next) => {
    // body should contain {iv, cipherText, lookupKey}
    let body = req.body
    if (body && body.iv && body.cipherText && body.lookupKey) {
      try {
        await models.Authentication.create({ iv: body.iv, cipherText: body.cipherText, lookupKey: body.lookupKey })
        return successResponse()
      } catch (err) {
        req.logger.error('Error signing up a user', err)
        return errorResponseBadRequest('Error signing up a user')
      }
    } else return errorResponseBadRequest('Missing one of the required fields: iv, cipherText, lookupKey')
  }))

  app.get('/authentication', handleResponse(async (req, res, next) => {
    let queryParams = req.query

    if (queryParams && queryParams.lookupKey) {
      const lookupKey = queryParams.lookupKey
      const existingUser = await models.Authentication.findOne({ where: { lookupKey } })

      // If username (email) provided, log if not found for future reference.
      if (queryParams.username) {
        const email = queryParams.username.toLowerCase()
        const userObj = await models.User.findOne({ where: { email } })
        if (existingUser && !userObj) {
          req.logger.warn(`No user found with email ${email} for auth record with lookupKey ${lookupKey}`)
        }
      }

      if (existingUser) {
        return successResponse(existingUser)
      } else {
        return errorResponseBadRequest('No auth record found for provided lookupKey.')
      }
    } else {
      return errorResponseBadRequest('Missing queryParam lookupKey.')
    }
  }))
}
