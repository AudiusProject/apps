const {
  handleResponse,
  successResponse,
  errorResponseBadRequest,
  errorResponseServerError
} = require('../apiHelpers')
const models = require('../models')
const config = require('../config')
const authMiddleware = require('../authMiddleware')
const {
  TOKEN_TTL_MS,
  generateVerificationToken,
  hashToken,
  sendVerificationEmail
} = require('../utils/emailVerification')

const WEBSITE_HOST = config.get('websiteHost') || 'https://audius.co'

module.exports = function (app) {
  /**
   * Verify an email address using a token from the verification email.
   * On success, redirects to the app with a status query param.
   */
  app.get('/email/verify', async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : null
    const redirectTo = (status) =>
      res.redirect(`${WEBSITE_HOST}/verify-email?status=${status}`)

    if (!token) {
      return redirectTo('invalid')
    }

    try {
      const hashed = hashToken(token)
      const user = await models.User.findOne({
        where: { emailVerificationToken: hashed }
      })

      if (!user) {
        return redirectTo('invalid')
      }

      const createdAt = user.emailVerificationTokenCreatedAt
      if (
        !createdAt ||
        Date.now() - new Date(createdAt).getTime() > TOKEN_TTL_MS
      ) {
        return redirectTo('expired')
      }

      await user.update({
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenCreatedAt: null
      })

      return redirectTo('success')
    } catch (err) {
      ;(req.logger || console).error('Error verifying email', err)
      return redirectTo('error')
    }
  })

  /**
   * Resend the verification email for the authenticated user.
   * Generates a new token, invalidating any previous one.
   */
  app.post(
    '/email/resend-verification',
    authMiddleware,
    handleResponse(async (req) => {
      const sg = req.app.get('sendgrid')
      if (!sg) {
        req.logger.error('Missing sendgrid api key')
        return successResponse({
          msg: 'No sendgrid API Key found',
          status: true
        })
      }

      const user = await models.User.findOne({
        where: { id: req.user.id }
      })

      if (!user) {
        return errorResponseBadRequest('User not found')
      }

      if (user.isEmailVerified) {
        return successResponse({ status: true, alreadyVerified: true })
      }

      const token = generateVerificationToken()
      const hashed = hashToken(token)

      try {
        await user.update({
          emailVerificationToken: hashed,
          emailVerificationTokenCreatedAt: new Date()
        })

        await sendVerificationEmail({
          email: user.email,
          token,
          sendgrid: sg,
          logger: req.logger
        })

        return successResponse({ status: true })
      } catch (err) {
        req.logger.error(
          `Error resending verification email to ${user.email}`,
          err
        )
        return errorResponseServerError('Failed to resend verification email')
      }
    })
  )
}
